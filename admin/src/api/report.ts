import request from './request'
import type { ApiResponse } from './request'

export interface ReportItem {
  id: number
  reporterId: number
  targetId: number
  type: 'user' | 'content' | 'photo'
  reason: 'harassment' | 'fraud' | 'fake_info' | 'abuse' | 'other'
  description?: string
  evidence?: string
  status: number
  result?: string
  remark?: string
  handlerId?: number
  createdAt: string
  updatedAt: string
}

export interface ReportFilter {
  page?: number
  limit?: number
  status?: number | string
  type?: string
  reason?: string
}

export interface ReportListResponse {
  list: ReportItem[]
  page: number
  limit: number
  total: number
}

export interface ProcessReportParams {
  status: number
  result?: string
  remark?: string
}

export const adminReport = {
  list(params: ReportFilter): Promise<ApiResponse<ReportListResponse>> {
    return request.get('/admin/reports', { params })
  },

  detail(id: number): Promise<ApiResponse<ReportItem>> {
    return request.get(`/admin/reports/${id}`)
  },

  process(id: number, data: ProcessReportParams): Promise<ApiResponse> {
    return request.put(`/admin/reports/${id}`, data)
  },
}
