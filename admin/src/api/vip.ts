import request from './request'
import type { ApiResponse } from './request'

export interface VipPackage {
  id: number
  name: string
  /** 价格（元）— 后端从数据库「分」转为「元」后返回，编辑保存时也传「元」 */
  price: number
  durationDays: number
  dailyTopCards: number
  topCardValidHours: number
  redLineCount: number
  description: string
  features: string[]
  tagText?: string
  tagColor?: string
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const vipPackages = {
  list(page = 1, limit = 20): Promise<ApiResponse<{ list: VipPackage[]; total: number }>> {
    return request.get('/admin/vip-packages', { params: { page, limit } })
  },

  create(data: Partial<VipPackage>): Promise<ApiResponse<VipPackage>> {
    return request.post('/admin/vip-packages', data)
  },

  update(id: number, data: Partial<VipPackage>): Promise<ApiResponse<VipPackage>> {
    return request.put(`/admin/vip-packages/${id}`, data)
  },

  toggleStatus(id: number): Promise<ApiResponse<VipPackage>> {
    return request.put(`/admin/vip-packages/${id}/toggle`)
  },

  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/vip-packages/${id}`)
  },
}

export const userPin = {
  /** 运营手动置顶 */
  pinUser(userId: number, durationHours: number, boostScore?: number): Promise<ApiResponse> {
    return request.post(`/admin/users/${userId}/pin`, { durationHours, boostScore })
  },
}


