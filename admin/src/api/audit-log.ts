import request from './request'
import type { ApiResponse } from './request'

export interface AuditLogItem {
  id: number
  adminId: number
  adminUsername: string
  action: string
  module: string
  method: string
  url: string
  ip: string
  detail?: string
  createdAt: string
}

export interface AuditLogFilter {
  page?: number
  limit?: number
  action?: string
  module?: string
  adminId?: string
  startDate?: string
  endDate?: string
}

export const adminAuditLogApi = {
  list(params: AuditLogFilter): Promise<ApiResponse<{ list: AuditLogItem[]; total: number; page: number; limit: number }>> {
    return request.get('/admin/audit-logs', { params })
  },
}
