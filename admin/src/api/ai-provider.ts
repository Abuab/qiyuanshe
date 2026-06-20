import request from './request'
import type { ApiResponse } from './request'

/** Provider 配置列表项 */
export interface ProviderConfigVO {
  id: number
  providerKey: string
  displayName: string
  apiKeyMasked: string
  apiBase: string
  modelName: string
  isEnabled: number
  isDefault: number
  weight: number
  priority: number
  balanceQueryUrl?: string
  createdAt: string
  updatedAt: string
}

/** Provider 创建/编辑输入 */
export interface ProviderConfigInput {
  providerKey: string
  displayName: string
  apiKey: string
  apiBase: string
  modelName: string
  isEnabled: boolean
  isDefault: boolean
  weight: number
  priority: number
  balanceQueryUrl?: string
}

/** 负载均衡策略 */
export type LoadBalanceStrategy = 'weighted' | 'primary_backup' | 'round_robin'

/** 余额告警记录 */
export interface BalanceAlertRecord {
  id: number
  providerId: number
  providerName: string
  currentBalance: number
  alertThreshold: number
  alertStatus: string
  alertCount: number
  lastQueryAt?: string
  lastAlertAt?: string
}

/** 成本统计项 */
export interface CostStats {
  providerId: number
  providerName: string
  totalCalls: number
  successCalls: number
  failedCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
  avgDurationMs: number
}

/** 调用摘要 */
export interface StatsSummary {
  todayCalls: number
  todayCost: number
  activeProviders: number
  totalProviders: number
}

/** 调用类型统计 */
export interface CallTypeStats {
  callType: string
  totalCalls: number
  byProvider: Record<string, number>
}

export const aiProviderApi = {
  // ==================== Provider CRUD ====================
  /** 获取所有 Provider 列表 */
  getList(): Promise<ApiResponse<ProviderConfigVO[]>> {
    return request.get('/admin/ai/provider/list')
  },

  /** 新增 Provider */
  create(data: ProviderConfigInput): Promise<ApiResponse<ProviderConfigVO>> {
    return request.post('/admin/ai/provider/create', data)
  },

  /** 编辑 Provider */
  update(id: number, data: Partial<ProviderConfigInput>): Promise<ApiResponse<ProviderConfigVO>> {
    return request.put(`/admin/ai/provider/${id}`, data)
  },

  /** 删除 Provider */
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/ai/provider/${id}`)
  },

  /** 设为默认 Provider */
  setDefault(id: number): Promise<ApiResponse> {
    return request.put(`/admin/ai/provider/${id}/set-default`)
  },

  /** 同步 Redis */
  syncRedis(): Promise<ApiResponse> {
    return request.post('/admin/ai/provider/sync-redis')
  },

  /** 从 .env 同步 Provider 到数据库 */
  seedFromEnv(): Promise<ApiResponse<{ created: number; skipped: number; message: string }>> {
    return request.post('/admin/ai/provider/seed-from-env')
  },

  /** 测试连接 */
  testConnection(id: number): Promise<ApiResponse> {
    return request.post(`/admin/ai/provider/${id}/test`)
  },

  // ==================== 策略 ====================
  /** 获取负载均衡策略 */
  getStrategy(): Promise<ApiResponse<{ strategy: LoadBalanceStrategy; updatedAt: string }>> {
    return request.get('/admin/ai/provider/strategy')
  },

  /** 切换策略 */
  setStrategy(strategy: LoadBalanceStrategy): Promise<ApiResponse> {
    return request.put('/admin/ai/provider/strategy', { strategy })
  },

  // ==================== 故障管理 ====================
  /** 冷却中的 Provider */
  getCooldownList(): Promise<ApiResponse<{ count: number; ids: number[] }>> {
    return request.get('/admin/ai/provider/cooldown-list')
  },

  /** 手动恢复 */
  recoverProvider(id: number): Promise<ApiResponse> {
    return request.post(`/admin/ai/provider/${id}/recover`)
  },

  // ==================== 余额 ====================
  /** 余额告警列表 */
  getBalanceAlerts(): Promise<ApiResponse<BalanceAlertRecord[]>> {
    return request.get('/admin/ai/provider/balance/alerts')
  },

  /** 手动查询单个余额 */
  queryBalance(id: number): Promise<ApiResponse<BalanceAlertRecord>> {
    return request.post(`/admin/ai/provider/balance/query/${id}`)
  },

  /** 全量余额检查 */
  checkAllBalances(): Promise<ApiResponse<{ checked: number; alerted: number }>> {
    return request.post('/admin/ai/provider/balance/check-all')
  },

  // ==================== 统计 ====================
  /** 摘要 */
  getStatsSummary(): Promise<ApiResponse<StatsSummary>> {
    return request.get('/admin/ai/provider/stats/summary')
  },

  /** 每日统计 */
  getDailyStats(): Promise<ApiResponse<CostStats[]>> {
    return request.get('/admin/ai/provider/stats/daily')
  },

  /** 成本统计 (日期范围) */
  getCostStats(params: { startDate?: string; endDate?: string }): Promise<ApiResponse<CostStats[]>> {
    return request.get('/admin/ai/provider/stats/cost', { params })
  },

  /** 调用类型统计 */
  getCallTypeStats(params: { startDate?: string; endDate?: string }): Promise<ApiResponse<CallTypeStats[]>> {
    return request.get('/admin/ai/provider/stats/call-types', { params })
  },

  /** 调用日志查询 */
  getCallLogs(params: Record<string, any>): Promise<ApiResponse> {
    return request.get('/admin/ai/provider/call-logs', { params })
  },
}
