import request from './request'
import type { ApiResponse } from './request'

export interface EducationAuthItem {
  id: number
  userId: number
  authData: {
    school?: string
    degree?: string
    image?: string
  }
  status: number // 0-待审核, 1-已通过, 2-已拒绝
  rejectReason?: string
  createdAt: string
  user?: {
    id: number
    nickname: string
  }
}

export interface EducationAuthListResponse {
  list: EducationAuthItem[]
  total: number
  page: number
  pageSize: number
}

export const adminEducationAuth = {
  /** 获取学历认证列表 */
  list(params: {
    page: number
    pageSize: number
    status?: number
  }): Promise<ApiResponse<EducationAuthListResponse>> {
    return request.get('/education-auth/admin/list', { params })
  },

  /** 审核学历认证 */
  audit(
    id: number,
    data: { status: number; rejectReason?: string }
  ): Promise<ApiResponse> {
    return request.put(`/education-auth/admin/audit/${id}`, data)
  },
}
