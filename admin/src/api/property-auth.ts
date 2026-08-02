import request from './request'
import type { ApiResponse } from './request'

export interface PropertyAuthItem {
  id: number
  userId: number
  nickname?: string
  avatar?: string
  status: number
  rejectReason?: string
  imageUrl?: string
  createdAt: string
}

export const propertyAuthApi = {
  list(params: { page?: number; pageSize?: number; status?: number | string }): Promise<ApiResponse<{ list: PropertyAuthItem[]; total: number }>> {
    return request.get('/property-auth/admin/list', { params })
  },

  audit(data: { id: number; status: number; rejectReason?: string }): Promise<ApiResponse> {
    return request.post('/property-auth/admin/audit', data)
  },
}
