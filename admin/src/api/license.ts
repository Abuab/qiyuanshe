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
  machineFingerprint?: string
  activatedAt?: string
  remoteStatus?: string
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
}
