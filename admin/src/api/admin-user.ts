import request from './request'
import type { ApiResponse } from './request'

export interface AdminAccount {
  id: number
  username: string
  nickname: string
  role: string
  status: number
  isMfaEnabled: boolean
  mfaSecret?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAdminAccountDto {
  username: string
  password: string
  nickname?: string
  role?: string
  status?: number
}

export interface UpdateAdminAccountDto {
  username?: string
  password?: string
  nickname?: string
  role?: string
  status?: number
}

export const adminAccountApi = {
  list(): Promise<ApiResponse<{ list: AdminAccount[] }>> {
    return request.get('/admin/admin-users')
  },

  create(data: CreateAdminAccountDto): Promise<ApiResponse> {
    return request.post('/admin/admin-users', data)
  },

  update(id: number, data: UpdateAdminAccountDto): Promise<ApiResponse> {
    return request.put(`/admin/admin-users/${id}`, data)
  },

  delete(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/admin-users/${id}`)
  },
}
