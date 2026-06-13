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
  ): Promise<ApiResponse<MessageListResponse>> {
    return request.get(`/admin/chat/conversations/${fromUserId}/${toUserId}`, {
      params: { page, limit },
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
}
