import request from './request'
import type { ApiResponse } from './request'

export interface Matchmaker {
  id: number
  name: string
  avatar?: string
  qrcode?: string
  phone?: string
  wechat?: string
  title?: string
  description?: string
  status: number
  sortOrder: number
  createdAt: string
}

export interface MatchmakerFilter {
  page?: number
  limit?: number
  keyword?: string
  status?: number
}

export interface MatchmakerListResponse {
  list: Matchmaker[]
  page: number
  limit: number
  total: number
}

export const adminMatchmaker = {
  list(params: MatchmakerFilter): Promise<ApiResponse<MatchmakerListResponse>> {
    return request.get('/admin/matchmakers', { params })
  },

  detail(id: number): Promise<ApiResponse<Matchmaker>> {
    return request.get(`/admin/matchmakers/${id}`)
  },

  create(data: Partial<Matchmaker>): Promise<ApiResponse> {
    return request.post('/admin/matchmakers', data)
  },

  update(id: number, data: Partial<Matchmaker>): Promise<ApiResponse> {
    return request.put(`/admin/matchmakers/${id}`, data)
  },

  delete(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/matchmakers/${id}`)
  },

  sort(id: number, sortOrder: number): Promise<ApiResponse> {
    return request.put(`/admin/matchmakers/${id}/sort`, { sortOrder })
  },

  upload(data: FormData): Promise<ApiResponse<{ url: string }>> {
    return request.post('/admin/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
