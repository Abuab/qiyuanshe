import request from './request'
import type { ApiResponse } from './request'

export interface ChatConversation {
  messageId: number
  fromUserId: number
  toUserId: number
  fromNickname: string
  toNickname: string
  fromAvatar: string
  toAvatar: string
  lastMessage: string
  messageType: string
  lastTime: string
}

export interface ChatMessageItem {
  id: number
  fromUserId: number
  toUserId: number
  content: string
  type: string
  isRead: number
  isProxy: number
  proxyBy?: number | null
  proxyName?: string | null
  createdAt: string
  fromUser?: { id: number; nickname: string; avatar: string }
  toUser?: { id: number; nickname: string; avatar: string }
}

export interface ConversationListResponse {
  list: ChatConversation[]
  page: number
  limit: number
  total: number
}

export interface MessageListResponse {
  list: ChatMessageItem[]
  page: number
  limit: number
  total: number
}

export const adminChat = {
  /** 通过公开 userId 解析用户 */
  resolveUser(publicId: string): Promise<ApiResponse<{ id: number; userId: string; nickname: string }>> {
    return request.get('/admin/chat/resolve-user', { params: { publicId } })
  },

  /** 所有用户会话列表 */
  getAllConversations(params: {
    page?: number
    limit?: number
    keyword?: string
  }): Promise<ApiResponse<ConversationListResponse>> {
    return request.get('/admin/chat/conversations', { params })
  },

  /** 两个用户之间的消息记录 */
  getMessages(
    fromUserId: number,
    toUserId: number,
    page?: number,
    limit?: number,
    beforeId?: number,
  ): Promise<ApiResponse<MessageListResponse>> {
    return request.get(`/admin/chat/conversations/${fromUserId}/${toUserId}`, {
      params: { page, limit, beforeId },
    })
  },

  /** 某用户的所有会话 */
  getUserConversations(
    userId: number,
    page?: number,
    limit?: number,
  ): Promise<ApiResponse<ConversationListResponse>> {
    return request.get(`/admin/chat/user/${userId}/conversations`, {
      params: { page, limit },
    })
  },

  // ==================== 聊天监控 / 代发 ====================

  /** 开始监控 */
  startMonitor(targetUserId: number): Promise<ApiResponse<any>> {
    return request.post('/admin/chat/monitor/start', { targetUserId })
  },

  /** 结束监控 */
  endMonitor(targetUserId: number): Promise<ApiResponse<any>> {
    return request.post('/admin/chat/monitor/end', { targetUserId })
  },

  /** 获取用户活跃监控状态 */
  getMonitorStatus(userId: number): Promise<ApiResponse<{ active: boolean; operatorName?: string }>> {
    return request.get(`/admin/chat/monitor/status/${userId}`)
  },

  /** 代发消息 */
  proxySend(targetUserId: number, toUserId: number, content: string): Promise<ApiResponse<any>> {
    return request.post('/admin/chat/proxy/send', { targetUserId, toUserId, content })
  },

  /** 操作日志查询 */
  getOperationLogs(params: Record<string, any>): Promise<ApiResponse<any>> {
    return request.get('/admin/chat/operation-logs', { params })
  },

  /** 活跃监控会话 */
  getActiveSessions(): Promise<ApiResponse<any[]>> {
    return request.get('/admin/chat/monitor/active')
  },

  /** 轮询增量拉取新消息 */
  pollMessages(
    userId: number,
    targetUserId: number,
    lastMessageId?: number,
  ): Promise<ApiResponse<{ list: ChatMessageItem[] }>> {
    return request.get('/admin/chat/messages', {
      params: { userId, targetUserId, lastMessageId: lastMessageId || 0 },
    })
  },
}
