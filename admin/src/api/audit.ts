import request from './request'
import type { ApiResponse } from './request'

export interface AuditItem {
  id: number
  targetType: 'user' | 'photo' | 'answer' | 'voice'
  targetId: number
  action: string
  reason?: string
  adminId?: number
  adminNote?: string
  content?: string
  aiResult?: string
  aiScore?: number
  submitterId?: number
  submitter?: {
    id: number
    nickname: string
    avatar: string
  } | null
  typeLabel?: string
  beforeAfter?: any
  createdAt: string
}

export interface AuditFilter {
  page?: number
  limit?: number
  type?: string
  status?: number
  startDate?: string
  endDate?: string
}

export interface AuditListResponse {
  list: AuditItem[]
  page: number
  limit: number
  total: number
}

export const adminAudit = {
  list(params: AuditFilter): Promise<ApiResponse<AuditListResponse>> {
    return request.get('/admin/audit/list', { params })
  },

  pendingCount(): Promise<ApiResponse<{ profile: number; circlePost: number; dynamic: number; total: number }>> {
    return request.get('/admin/audit/pending-count')
  },

  approve(id: number): Promise<ApiResponse> {
    return request.post(`/admin/audit/${id}/approve`)
  },

  reject(id: number, reason: string): Promise<ApiResponse> {
    return request.post(`/admin/audit/${id}/reject`, { reason })
  },

  batchApprove(ids: number[]): Promise<ApiResponse> {
    return request.post('/admin/audit/batch-approve', { ids })
  },

  batchReject(ids: number[], reason: string): Promise<ApiResponse> {
    return request.post('/admin/audit/batch-reject', { ids, reason })
  },

  getHistory(type: string, targetId: number): Promise<ApiResponse> {
    return request.get(`/admin/audit/history/${type}/${targetId}`)
  },

  voiceAudit(userId: number, status: number, remark?: string): Promise<ApiResponse> {
    return request.post('/admin/audit/voice-audit', { userId, status, remark })
  },
}
