import request from './request'
import type { ApiResponse } from './request'

export interface AiFeatureSwitch {
  key: string
  label: string
  keyName: string
  enabled: boolean
  lastModifiedAt: string
}

export interface AiFeatureConfig {
  master: AiFeatureSwitch
  features: AiFeatureSwitch[]
}

export interface SwitchLogItem {
  id: number
  featureKey: string
  oldValue: string
  newValue: string
  operatorId: number
  operatorName: string
  ipAddress: string
  createdAt: string
}

export interface SwitchLogData {
  items: SwitchLogItem[]
  total: number
  page: number
  limit: number
}

export const adminAi = {
  /** 获取完整开关配置 */
  getSwitches(): Promise<ApiResponse<AiFeatureConfig>> {
    return request.get('/admin/ai/switches')
  },

  /** 更新子功能开关 */
  updateSwitch(key: string, enabled: boolean): Promise<ApiResponse> {
    return request.put('/admin/ai/switch', { key, enabled })
  },

  /** 更新总开关（仅超管） */
  updateMasterSwitch(enabled: boolean): Promise<ApiResponse> {
    return request.put('/admin/ai/master-switch', { enabled })
  },

  /** 获取开关操作日志 */
  getSwitchLogs(page = 1, limit = 20): Promise<ApiResponse<SwitchLogData>> {
    return request.get('/admin/ai/switch-logs', { params: { page, limit } })
  },
}
