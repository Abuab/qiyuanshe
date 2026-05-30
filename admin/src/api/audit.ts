import request from './request'
import type { ApiResponse } from './request'

export interface AuditItem {
  id: number
  type: 'user' | 'photo' | 'answer'
  targetId: number
  userId: number
  content?: string
  extraData?: any
  aiResult: string
  aiSuggestion: string
  status: number
  reason?: string
  adminId?: number
  adminNote?: string
  createdAt: string
  updatedAt: string
  submitter?: string
  submitterAvatar?: string
  submitterNickname?: string
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
    const statusMap: Record<string, number | undefined> = {
      pending: 0,
      approved: 1,
      rejected: 2,
    }
    return request.get('/admin/audit/list', { params: { ...params, status: statusMap[params?.status?.toString() || ''] } })
  },

  pendingCount(): Promise<ApiResponse<number>> {
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
}
