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
}

export interface MachineBindingInfo {
  /** 本机机器指纹 */
  machineFingerprint: string
  /** 当前 License Key 绑定的机器指纹（未绑定或未激活时为空） */
  boundMachineId: string | null
}

export const licenseApi = {
  /** 获取当前授权状态 */
  getStatus(): Promise<ApiResponse<LicenseInfo>> {
    return request.get('/admin/license/status')
  },

  /** 获取本机机器指纹与绑定信息 */
  getMachine(): Promise<ApiResponse<MachineBindingInfo>> {
    return request.get('/admin/license/machine')
  },

  /** 激活/更新 License Key */
  activate(licenseKey: string): Promise<ApiResponse<LicenseInfo>> {
    return request.post('/admin/license/activate', { licenseKey })
  },
}
