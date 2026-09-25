import request from './request'
import type { ApiResponse } from './request'

// ================================================================
// CRM 客户阶段常量
// ================================================================

export const CRM_STAGE = {
  NEW: 0,
  CONTACTED: 1,
  FOLLOWING: 2,
  PAID: 3,
  SUCCESS: 4,
  LOST: 5,
} as const

export const CRM_STAGE_LABELS: Record<number, string> = {
  [CRM_STAGE.NEW]: '新注册',
  [CRM_STAGE.CONTACTED]: '初步接触',
  [CRM_STAGE.FOLLOWING]: '深度跟进',
  [CRM_STAGE.PAID]: '已付费',
  [CRM_STAGE.SUCCESS]: '脱单成功',
  [CRM_STAGE.LOST]: '流失',
}

export const CRM_STAGE_COLORS: Record<number, string> = {
  [CRM_STAGE.NEW]: 'info',
  [CRM_STAGE.CONTACTED]: 'primary',
  [CRM_STAGE.FOLLOWING]: 'warning',
  [CRM_STAGE.PAID]: 'success',
  [CRM_STAGE.SUCCESS]: 'success',
  [CRM_STAGE.LOST]: 'danger',
}

// ================================================================
// 类型定义
// ================================================================

export interface CrmCustomer {
  id: number
  userId?: string
  nickname: string
  avatar?: string
  gender: number
  phone?: string
  isVip: number
  status: number
  crmStage: number
  crmOwnerId: number | null
  ownerName: string
  createdAt: string
}

export interface CrmCustomerListResponse {
  list: CrmCustomer[]
  page: number
  limit: number
  total: number
}

export interface CrmStageStat {
  value: number
  label: string
  count: number
}

export interface CrmFunnel {
  total: number
  unassigned: number
  stageCounts: Record<number, number>
  stages: CrmStageStat[]
}

export interface CrmAssignableAdmin {
  id: number
  nickname: string
  role: string
}

export interface CrmFollowRecord {
  id: number
  userId: number
  adminUserId: number
  adminName: string
  content: string
  nextFollowAt: string | null
  createdAt: string
}

export interface CrmDueFollowUp {
  userId: number
  nickname: string
  avatar: string
  phone: string
  nextFollowAt: string
  lastContent: string
  lastFollowAt: string
}

export interface CrmWorkspace {
  myCustomerCount: number
  stageCounts: Record<number, number>
  dueFollowUpCount: number
  dueFollowUps: CrmDueFollowUp[]
}

export interface CrmCustomerFilter {
  page?: number
  limit?: number
  keyword?: string
  stage?: number
  ownerId?: number
}

// ================================================================
// API
// ================================================================

export const crm = {
  /** 客户列表 */
  listCustomers(params: CrmCustomerFilter): Promise<ApiResponse<CrmCustomerListResponse>> {
    return request.get('/admin/crm/customers', { params })
  },

  /** 销售漏斗统计 */
  funnel(): Promise<ApiResponse<CrmFunnel>> {
    return request.get('/admin/crm/funnel')
  },

  /** 阶段标签 */
  stages(): Promise<ApiResponse<{ value: number; label: string }[]>> {
    return request.get('/admin/crm/stages')
  },

  /** 可分配负责人列表 */
  admins(): Promise<ApiResponse<CrmAssignableAdmin[]>> {
    return request.get('/admin/crm/admins')
  },

  /** 线索分配（批量） */
  assign(userIds: number[], ownerId: number): Promise<ApiResponse<{ updated: number }>> {
    return request.put('/admin/crm/assign', { userIds, ownerId })
  },

  /** 某客户跟进记录 */
  followRecords(userId: number): Promise<ApiResponse<CrmFollowRecord[]>> {
    return request.get('/admin/crm/follow-records', { params: { userId } })
  },

  /** 新增跟进记录（可选同时更新阶段） */
  createFollowRecord(data: {
    userId: number
    content: string
    nextFollowAt?: string
    stage?: number
  }): Promise<ApiResponse<CrmFollowRecord>> {
    return request.post('/admin/crm/follow-records', data)
  },

  /** 红娘工作台 */
  workspace(): Promise<ApiResponse<CrmWorkspace>> {
    return request.get('/admin/crm/workspace')
  },
}
