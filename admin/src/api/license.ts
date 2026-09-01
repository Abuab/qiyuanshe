import request from './request'
import type { ApiResponse } from './request'

export type LicenseStatus = 'valid' | 'grace_period' | 'expired' | 'unauthorized'

export interface LicenseInfo {
  status: LicenseStatus
  expiresAt: string
  features: string[]
  graceDaysLeft: number
  lockMessage: string
  customer?: string
  customerId?: string
  domain?: string
  activatedAt?: string
  remoteStatus?: string
  maxActivations?: number
}

export interface ActivationSummary {
  maxActivations: number
  activationCount: number
  activations: Array<{
    id: number
    domain: string | null
    ip: string | null
    activated_at: string | null
    last_heartbeat_at: string | null
  }>
}

export const licenseApi = {
  /** 获取当前授权状态 */
  getStatus(): Promise<ApiResponse<LicenseInfo>> {
    return request.get('/admin/license/status')
  },

  /** 激活/更新 License Key */
  activate(licenseKey: string): Promise<ApiResponse<LicenseInfo>> {
    return request.post('/admin/license/activate', { licenseKey })
  },

  /** 解绑当前服务器（释放激活名额） */
  deactivate(): Promise<ApiResponse<null>> {
    return request.post('/admin/license/deactivate')
  },

  /** 查询激活实例数 / 最大激活数 */
  getActivations(): Promise<ApiResponse<ActivationSummary>> {
    return request.get('/admin/license/activations')
  },
}
