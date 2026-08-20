import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Inject, forwardRef, OnModuleDestroy } from '@nestjs/common'
import { Server, WebSocket } from 'ws'
import { JwtService } from '@nestjs/jwt'
import { adminJwtConfig } from '../config/jwt'
import { ChatMonitorService } from './chat-monitor.service'

/** WebSocket 认证信息 */
interface WsAuth {
  type: 'admin'
  userId: number
}

/** 自定义 WebSocket 扩展 */
interface AuthenticatedWs extends WebSocket {
  auth?: WsAuth
  isAlive?: boolean
}

/**
 * 聊天监控 WebSocket 网关（仅管理后台使用，纯 WebSocket 协议）
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
export class ChatMonitorGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  private server: Server

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
        if (client.isAlive === false) {
          // 僵尸连接：主动从 Map 中清理，避免 close 事件未回调导致的内存堆积
          this.cleanup(client)
          return client.terminate()
        }
        client.isAlive = false
        client.ping()
      })
    }, 30000)
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    this.adminSockets.clear()
    this.monitorSubscriptions.clear()
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

  /** 客户端认证 */
  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: AuthenticatedWs,
    @MessageBody() payload: { token: string },
  ) {
    try {
      const token = payload?.token
      if (!token) throw new Error('missing token')

      // 仅接受管理后台 JWT（C 端已改 HTTP 轮询，不再连接 WebSocket）
      const decoded = this.jwtService.verify(token, {
        secret: adminJwtConfig.secret,
      })
      const auth: WsAuth = { type: 'admin', userId: decoded.sub }
      this.adminSockets.set(decoded.sub, client)

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
    const { userId } = client.auth

    this.adminSockets.delete(userId)
    // 清理该管理员的所有订阅
    for (const [targetUserId, adminIds] of this.monitorSubscriptions) {
      adminIds.delete(userId)
      if (adminIds.size === 0) this.monitorSubscriptions.delete(targetUserId)
    }
  }
}
