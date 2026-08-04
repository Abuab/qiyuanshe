import request from './request'
import type { ApiResponse } from './request'

export interface OperationTag {
  id: number
  name: string
  color: string
  isEnabled: number
  sortOrder: number
  isDeleted: number
  createdAt: string
  updatedAt: string
}

export const operationTagApi = {
  list(): Promise<ApiResponse<OperationTag[]>> {
    return request.get('/admin/operation-tags')
  },

  getEnabled(): Promise<ApiResponse<Pick<OperationTag, 'id' | 'name' | 'color'>[]>> {
    return request.get('/admin/operation-tags/enabled')
  },

  detail(id: number): Promise<ApiResponse<OperationTag>> {
    return request.get(`/admin/operation-tags/${id}`)
  },

  create(data: Partial<OperationTag>): Promise<ApiResponse<OperationTag>> {
    return request.post('/admin/operation-tags', data)
  },

  update(id: number, data: Partial<OperationTag>): Promise<ApiResponse> {
    return request.put(`/admin/operation-tags/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/operation-tags/${id}`)
  },
}
