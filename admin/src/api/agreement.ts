import request from './request'
import type { ApiResponse } from './request'

export interface Agreement {
  id: number
  type: 'USER_AGREEMENT' | 'PRIVACY_POLICY' | 'VIP_AGREEMENT' | 'SELF_DISCIPLINE_STATEMENT'
  title: string
  content: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export const adminAgreement = {
  /** 获取协议列表 */
  list(): Promise<ApiResponse<Agreement[]>> {
    return request.get('/admin/agreements')
  },

  /** 创建/更新协议 */
  save(data: { type: string; title: string; content: string }): Promise<ApiResponse<Agreement>> {
    return request.post('/admin/agreements', data)
  },
}
