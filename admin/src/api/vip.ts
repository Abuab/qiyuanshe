import request from './request'
import type { ApiResponse } from './request'

export interface VipPackage {
  id: number
  name: string
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

export interface TopRecord {
  id: number
  userId: number
  user?: { id: number; nickname: string; avatar?: string }
  topStartTime: string
  topEndTime: string
  source: string
  status: number
  createdAt: string
}

export interface TopRecordFilter {
  page?: number
  limit?: number
  keyword?: string
  source?: string
  startDate?: string
  endDate?: string
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

  updateSort(items: { id: number; sortOrder: number }[]): Promise<ApiResponse> {
    return request.put('/admin/vip-packages/sort/batch', { items })
  },
}

export const topRecords = {
  list(filter: TopRecordFilter): Promise<ApiResponse<{ list: TopRecord[]; total: number }>> {
    return request.get('/admin/top-records', { params: filter })
  },
}

export const userPin = {
  /** 运营手动置顶 */
  pinUser(userId: number, durationHours: number, boostScore?: number): Promise<ApiResponse> {
    return request.post(`/admin/users/${userId}/pin`, { durationHours, boostScore })
  },
}

export const vipConfig = {
  getCustom(): Promise<ApiResponse<any>> {
    return request.get('/admin/vip-config/custom')
  },
  saveCustom(data: any): Promise<ApiResponse> {
    return request.put('/admin/vip-config/custom', data)
  },
  getAbout(): Promise<ApiResponse<any>> {
    return request.get('/admin/vip-config/about')
  },
  saveAbout(data: any): Promise<ApiResponse> {
    return request.put('/admin/vip-config/about', data)
  },
  getSafetyTips(): Promise<ApiResponse<{ tips: string[] }>> {
    return request.get('/admin/vip-config/safety-tips')
  },
  saveSafetyTips(tips: string[]): Promise<ApiResponse> {
    return request.put('/admin/vip-config/safety-tips', { tips })
  },
}
