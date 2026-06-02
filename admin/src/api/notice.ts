import request from './request'
import type { ApiResponse } from './request'

export interface Notice {
  id: number
  title: string
  content: string
  type: 'popup' | 'list'
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const noticeApi = {
  list(params?: { page?: number; limit?: number; status?: number }): Promise<ApiResponse<{ list: Notice[]; total: number; page: number; limit: number }>> {
    return request.get('/admin/notices', { params })
  },

  create(data: Partial<Notice>): Promise<ApiResponse<Notice>> {
    return request.post('/admin/notices', data)
  },

  update(id: number, data: Partial<Notice>): Promise<ApiResponse> {
    return request.put(`/admin/notices/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/notices/${id}`)
  },
}
