import request from './request'
import type { ApiResponse } from './request'

export interface StorageConfig {
  storageType: 'local' | 'sls'
  localBackup: boolean
  slsProject: string
  slsLogstore: string
  slsEndpoint: string
  slsAccessKeyId: string
  slsAccessKeySecretMasked: string
}

export interface AgreementLogItem {
  id: string | number
  userId: number
  agreementType: string
  version: string
  action: string
  ipAddress: string
  userAgent: string
  storageSource: string
  createdAt: string
}

export const agreementLogStorage = {
  /** 获取存储配置 */
  getConfig(): Promise<ApiResponse<StorageConfig>> {
    return request.get('/admin/agreement-log-storage/config')
  },

  /** 更新存储配置 */
  updateConfig(config: Partial<StorageConfig> & { slsAccessKeySecret?: string }): Promise<ApiResponse<StorageConfig>> {
    return request.put('/admin/agreement-log-storage/config', config)
  },

  /** 测试 SLS 连接 */
  testConnection(config: {
    slsProject: string
    slsLogstore: string
    slsEndpoint: string
    slsAccessKeyId: string
    slsAccessKeySecret: string
  }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return request.post('/admin/agreement-log-storage/config/test', config)
  },

  /** 查询同意记录 */
  getLogs(params: {
    userId?: number
    agreementType?: string
    startTime?: string
    endTime?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ items: AgreementLogItem[]; total: number }>> {
    return request.get('/admin/agreement-log-storage/logs', { params })
  },

  /** 导出 CSV */
  exportLogs(params: { userId?: number; startTime?: string; endTime?: string }): Promise<Blob> {
    return request.get('/admin/agreement-log-storage/logs/export', {
      params,
      responseType: 'blob',
    })
  },

  /** 跨策略迁移数据 */
  migrate(params: { from: 'local' | 'sls'; to: 'local' | 'sls' }): Promise<ApiResponse<{ migrated: number }>> {
    return request.post('/admin/agreement-log-storage/migrate', params)
  },
}
