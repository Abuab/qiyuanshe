import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets'
import { UseGuards, Inject, forwardRef } from '@nestjs/common'
import { Server, WebSocket } from 'ws'
import { JwtService } from '@nestjs/jwt'
import { ChatMonitorService } from './chat-monitor.service'

/** WebSocket 认证信息 */
interface WsAuth {
  /** 'admin' | 'user' */
  type: 'admin' | 'user'
  userId: number
  /** 运营人员昵称（仅 admin） */
  nickname?: string
}

/** 自定义 WebSocket 扩展 */
interface AuthenticatedWs extends WebSocket {
  auth?: WsAuth
  isAlive?: boolean
}

/**
 * 聊天监控 WebSocket 网关（纯 WebSocket 协议，兼容 uni-app uni.connectSocket）
 *
 * 协议设计：
 *   客户端发送:  JSON  { "event": "事件名", "data": { ... } }
 *   服务端推送:  JSON  { "event": "事件名", "data": { ... } }
 *
 * 事件列表：
 *   auth           客户端认证（token 验证）
 *   subscribe      管理员订阅某用户的聊天消息
 *   unsubscribe    管理员取消订阅
 *   new_message    新消息推送（服务端→客户端）
 */
@WebSocketGateway({
  path: '/ws/chat',
})
export class ChatMonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server

  /** userId → WebSocket 连接集合 */
  private userSockets = new Map<number, Set<AuthenticatedWs>>()

  /** adminUserId → WebSocket */
  private adminSockets = new Map<number, AuthenticatedWs>()

  /** targetUserId → 正在监控该用户的 adminSockets */
  private monitorSubscriptions = new Map<number, Set<number>>()

  /** 心跳检测定时器 */
  private heartbeatInterval: ReturnType<typeof setInterval>

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatMonitorService))
    private readonly monitorService: ChatMonitorService,
  ) {
    // 30 秒心跳检测，清理断开连接
    this.heartbeatInterval = setInterval(() => {
      this.server?.clients.forEach((ws) => {
        const client = ws as AuthenticatedWs
        if (client.isAlive === false) return client.terminate()
        client.isAlive = false
        client.ping()
      })
    }, 30000)
  }

  handleConnection(client: AuthenticatedWs) {
    client.isAlive = true
    client.on('pong', () => {
      client.isAlive = true
    })
  }

  handleDisconnect(client: AuthenticatedWs) {
    this.cleanup(client)
  }

  /** 处理客户端 JSON ping，刷新心跳存活标记（配合服务端 ws.ping() 保活） */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedWs) {
    client.isAlive = true
  }

  /** 客户端认证 */
  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedWs,
    @MessageBody() payload: { token: string; type?: 'admin' | 'user' },
  ) {
    try {
      const token = payload?.token
      if (!token) throw new Error('missing token')

      let auth: WsAuth

      if (payload?.type === 'admin') {
        // 管理后台 JWT
        const decoded = this.jwtService.verify(token, {
          secret: process.env.ADMIN_JWT_SECRET || 'qiyuanshe-admin-jwt-secret-2024',
        })
        auth = { type: 'admin', userId: decoded.sub, nickname: decoded.nickname }
        this.adminSockets.set(decoded.sub, client)
      } else {
        // 用户端 JWT
        const decoded = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'qiyuanshe-jwt-secret-key-2024',
        })
        auth = { type: 'user', userId: decoded.sub }

        if (!this.userSockets.has(decoded.sub)) {
          this.userSockets.set(decoded.sub, new Set())
        }
        this.userSockets.get(decoded.sub)!.add(client)
      }

      client.auth = auth
      this.sendTo(client, 'auth_success', { userId: auth.userId, type: auth.type })
    } catch {
      this.sendTo(client, 'auth_error', { message: '认证失败，请重新登录' })
      client.close(4001, 'unauthorized')
    }
  }

  /** 管理员订阅用户聊天 */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedWs,
    @MessageBody() payload: { targetUserId: number },
  ) {
    const auth = this.requireAdmin(client)
    if (!auth) return

    const { targetUserId } = payload
    if (!targetUserId) {
      this.sendTo(client, 'error', { message: '缺少 targetUserId' })
      return
    }

    // 检查并发冲突
    const lockResult = await this.monitorService.tryLockTarget(auth.userId, targetUserId)
    if (!lockResult.success) {
      this.sendTo(client, 'monitor_locked', {
        message: lockResult.message || '该用户正在被其他运营人员监控',
        lockedBy: lockResult.lockedBy,
      })
      return
    }

    // 记录订阅
    if (!this.monitorSubscriptions.has(targetUserId)) {
      this.monitorSubscriptions.set(targetUserId, new Set())
    }
    this.monitorSubscriptions.get(targetUserId)!.add(auth.userId)

    this.sendTo(client, 'subscribed', { targetUserId, sessionId: lockResult.sessionId })
  }

  /** 管理员取消订阅 */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedWs,
    @MessageBody() payload: { targetUserId: number },
  ) {
    const auth = this.requireAdmin(client)
    if (!auth) return

    const { targetUserId } = payload
    const subs = this.monitorSubscriptions.get(targetUserId)
    if (subs) {
      subs.delete(auth.userId)
      if (subs.size === 0) this.monitorSubscriptions.delete(targetUserId)
    }

    await this.monitorService.endMonitor(auth.userId, targetUserId)
    this.sendTo(client, 'unsubscribed', { targetUserId })
  }

  /** 转发用户收发的消息给监控该用户的管理员 */
  notifyAdmin(targetUserId: number, messageData: any) {
    const adminIds = this.monitorSubscriptions.get(targetUserId)
    if (!adminIds || adminIds.size === 0) return

    const payload = JSON.stringify({
      event: 'new_message',
      data: messageData,
    })

    for (const adminId of adminIds) {
      const adminWs = this.adminSockets.get(adminId)
      if (adminWs?.readyState === WebSocket.OPEN) {
        adminWs.send(payload)
      }
    }
  }

  /** 推送新消息给指定用户（消息接收方实时接收） */
  notifyUser(userId: number, messageData: any) {
    const userSockets = this.userSockets.get(userId)
    if (!userSockets || userSockets.size === 0) return
    const payload = JSON.stringify({ event: 'new_message', data: messageData })
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  /** 推送会话更新事件给指定用户（新会话、未读数变更等） */
  notifyConversationUpdate(userId: number, data: any) {
    const userSockets = this.userSockets.get(userId)
    if (!userSockets || userSockets.size === 0) return
    const payload = JSON.stringify({ event: 'conversation_update', data })
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload)
    }
  }

  // ==================== 工具方法 ====================

  private requireAdmin(client: AuthenticatedWs): WsAuth | null {
    if (!client.auth) {
      this.sendTo(client, 'error', { message: '请先认证' })
      return null
    }
    if (client.auth.type !== 'admin') {
      this.sendTo(client, 'error', { message: '无权限' })
      return null
    }
    return client.auth
  }

  private sendTo(client: AuthenticatedWs, event: string, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }))
    }
  }

  private cleanup(client: AuthenticatedWs) {
    if (!client.auth) return
    const { userId, type } = client.auth

    if (type === 'user') {
      const sockets = this.userSockets.get(userId)
      if (sockets) {
        sockets.delete(client)
        if (sockets.size === 0) this.userSockets.delete(userId)
      }
    } else if (type === 'admin') {
      this.adminSockets.delete(userId)
      // 清理该管理员的所有订阅
      for (const [targetUserId, adminIds] of this.monitorSubscriptions) {
        adminIds.delete(userId)
        if (adminIds.size === 0) this.monitorSubscriptions.delete(targetUserId)
      }
    }
  }
}
