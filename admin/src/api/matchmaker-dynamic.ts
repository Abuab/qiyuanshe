import request from './request'
import type { ApiResponse } from './request'

export interface MatchmakerDynamicItem {
  id: number
  matchmakerId: number
  matchmakerName: string
  matchmakerAvatar: string
  matchedUserId: number
  matchedNickname: string
  matchedAvatar: string
  remark: string
  status: string
  createdAt: string
}

export interface MatchmakerDynamicListResponse {
  list: MatchmakerDynamicItem[]
  page: number
  limit: number
  total: number
}

export const adminMatchmakerDynamic = {
  list(page = 1, limit = 20): Promise<ApiResponse<MatchmakerDynamicListResponse>> {
    return request.get('/admin/matchmaker-dynamics', { params: { page, limit } })
  },

  create(data: { matchmakerId: number; matchedUserId: number; remark: string }): Promise<ApiResponse> {
    return request.post('/admin/matchmaker-dynamics', data)
  },

  update(id: number, data: { remark?: string; status?: string }): Promise<ApiResponse> {
    return request.put(`/admin/matchmaker-dynamics/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/matchmaker-dynamics/${id}`)
  },
}
