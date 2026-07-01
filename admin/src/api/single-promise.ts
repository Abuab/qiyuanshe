import request from './request'
import type { ApiResponse } from './request'

export interface SinglePromiseItem {
  id: number
  userId: number
  realName: string
  signatureUrl: string
  status: number // 0-待审核, 1-已通过, 2-已拒绝
  rejectReason?: string
  auditTime?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    nickname: string
  }
}

export interface SinglePromiseListResponse {
  list: SinglePromiseItem[]
  total: number
  page: number
  pageSize: number
}

export const adminSinglePromise = {
  /** 获取单身承诺列表 */
  list(params: {
    page: number
    pageSize: number
    status?: number
  }): Promise<ApiResponse<SinglePromiseListResponse>> {
    return request.get('/single-promise/admin/list', { params })
  },

  /** 审核单身承诺 */
  audit(
    id: number,
    data: { status: number; rejectReason?: string; adminId?: number }
  ): Promise<ApiResponse> {
    return request.put(`/single-promise/admin/audit/${id}`, data)
  },
}
