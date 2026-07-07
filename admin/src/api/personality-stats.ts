import request from './request'
import type { ApiResponse } from './request'

// ==================== 类型 ====================

export interface StatsOverview {
  registeredTotal: number
  guestTotal: number
  total: number
  todayNew: number
  todayNewRegistered: number
  todayNewGuest: number
  avgDurationSeconds: number
  startedTotal: number
  completedTotal: number
  completionRate: number
}

export interface TypeDistributionItem {
  typeCode: string
  typeName: string
  nickname: string | null
  count: number
  ratio: number
}

export interface TypeDistributionData {
  total: number
  items: TypeDistributionItem[]
}

export interface TypeUserItem {
  userId: number
  nickname: string
  avatar: string
  gender: number
  testedAt: string | null
}

export interface TypeUsersData {
  total: number
  page: number
  pageSize: number
  list: TypeUserItem[]
}

export interface DimensionDirection {
  label: string
  count: number
  ratio: number
}

export interface DimensionDistributionItem {
  code: string
  name: string
  total: number
  directions: DimensionDirection[]
}

export interface DimensionDistributionData {
  items: DimensionDistributionItem[]
}

export interface QuestionStatOption {
  optionId: number
  content: string
  count: number
  ratio: number
}

export interface QuestionStatItem {
  questionId: number
  content: string
  total: number
  options: QuestionStatOption[]
}

export interface QuestionStatsData {
  items: QuestionStatItem[]
}

export interface FunnelItem {
  slotId: number
  slotCode: string
  slotName: string
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cvr: number
}

export interface FunnelData {
  items: FunnelItem[]
}

export interface FloatButtonData {
  testModeImpressions: number
  testModeClicks: number
  testModeConversions: number
  askModeTracked: boolean
  askModeClicks: number | null
}

// ==================== API ====================

export const personalityStatsApi = {
  overview(): Promise<ApiResponse<StatsOverview>> {
    return request.get('/admin/personality/stats/overview')
  },
  typeDistribution(): Promise<ApiResponse<TypeDistributionData>> {
    return request.get('/admin/personality/stats/type-distribution')
  },
  typeUsers(params: { typeCode: string; page: number; pageSize: number }): Promise<ApiResponse<TypeUsersData>> {
    return request.get('/admin/personality/stats/type-users', { params })
  },
  dimensionDistribution(): Promise<ApiResponse<DimensionDistributionData>> {
    return request.get('/admin/personality/stats/dimension-distribution')
  },
  questionStats(): Promise<ApiResponse<QuestionStatsData>> {
    return request.get('/admin/personality/stats/question-stats')
  },
  funnel(): Promise<ApiResponse<FunnelData>> {
    return request.get('/admin/personality/stats/funnel')
  },
  floatButton(): Promise<ApiResponse<FloatButtonData>> {
    return request.get('/admin/personality/stats/float-button')
  },
}
