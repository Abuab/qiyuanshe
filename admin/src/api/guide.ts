import request from './request'
import type { ApiResponse } from './request'

// ==================== 类型 ====================

export type CopyDisplayMode = 'carousel' | 'ab_test' | 'all'
export type FloatingButtonMode = 'ask' | 'test'

export interface FloatingButtonStyle {
  text: string
  icon: string
  bgColor: string
  target: string
}

export interface FloatingButtonConfig {
  mode: FloatingButtonMode
  ask: FloatingButtonStyle
  test: FloatingButtonStyle
}

export interface CopySlotItem {
  id: number
  code: string
  name: string
  pageLocation: string | null
  remark: string | null
  displayMode: CopyDisplayMode
  isSystem: number
  isEnabled: number
  sort: number
  itemCount?: number
}

export interface CopyItemData {
  id: number
  slotId: number
  mainText: string
  subText: string | null
  weight: number
  targetLoginState: string | null
  targetGender: number | null
  targetTested: number | null
  isEnabled: number
  sort: number
}

export interface DashboardItem {
  id: number
  mainText: string
  subText: string | null
  isEnabled: number
  weight: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  conversionRate: number
  trend: { impressions: number[]; clicks: number[]; conversions: number[] }
}

export interface DashboardData {
  slot: { id: number; code: string; name: string; displayMode: CopyDisplayMode }
  dates: string[]
  items: DashboardItem[]
  winnerItemId: number | null
  winnerMinImpressions: number
}

// ==================== 首页浮动按钮 ====================

export const floatingButtonApi = {
  get(): Promise<ApiResponse<FloatingButtonConfig>> {
    return request.get('/admin/guide/floating-button')
  },
  save(data: FloatingButtonConfig): Promise<ApiResponse<FloatingButtonConfig>> {
    return request.put('/admin/guide/floating-button', data)
  },
}

// ==================== 文案位 ====================

export const copySlotApi = {
  getList(): Promise<ApiResponse<CopySlotItem[]>> {
    return request.get('/admin/guide/slots')
  },
  getOne(id: number): Promise<ApiResponse<CopySlotItem>> {
    return request.get(`/admin/guide/slots/${id}`)
  },
  create(data: Partial<CopySlotItem>): Promise<ApiResponse<CopySlotItem>> {
    return request.post('/admin/guide/slots', data)
  },
  update(id: number, data: Partial<CopySlotItem>): Promise<ApiResponse<CopySlotItem>> {
    return request.put(`/admin/guide/slots/${id}`, data)
  },
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/guide/slots/${id}`)
  },
  getDashboard(id: number): Promise<ApiResponse<DashboardData>> {
    return request.get(`/admin/guide/slots/${id}/dashboard`)
  },
}

// ==================== 文案条目 ====================

export const copyItemApi = {
  listBySlot(slotId: number): Promise<ApiResponse<CopyItemData[]>> {
    return request.get('/admin/guide/items', { params: { slotId } })
  },
  create(data: Partial<CopyItemData>): Promise<ApiResponse<CopyItemData>> {
    return request.post('/admin/guide/items', data)
  },
  update(id: number, data: Partial<CopyItemData>): Promise<ApiResponse<CopyItemData>> {
    return request.put(`/admin/guide/items/${id}`, data)
  },
  setStatus(id: number, isEnabled: number): Promise<ApiResponse> {
    return request.put(`/admin/guide/items/${id}/status`, { isEnabled })
  },
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/guide/items/${id}`)
  },
}
