import request from './request'
import type { ApiResponse } from './request'

export interface CarAuthItem {
  id: number
  userId: number
  nickname?: string
  avatar?: string
  status: number
  rejectReason?: string
  imageUrl?: string
  createdAt: string
}

export const carAuthApi = {
  list(params: { page?: number; pageSize?: number; status?: number | string }): Promise<ApiResponse<{ list: CarAuthItem[]; total: number }>> {
    return request.get('/car-auth/admin/list', { params })
  },

  audit(data: { id: number; status: number; rejectReason?: string }): Promise<ApiResponse> {
    return request.post('/car-auth/admin/audit', data)
  },
}
