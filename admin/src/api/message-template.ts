import request from './request'
import type { ApiResponse } from './request'

export interface MessageTemplate {
  id: number
  name: string
  title: string
  content: string
  category: string
  placeholders?: { key: string; label: string; example: string }[]
  useCount: number
  lastUsedAt?: string
  isDeleted: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TemplateFilter {
  page?: number
  limit?: number
  category?: string
  keyword?: string
}

export const messageTemplateApi = {
  list(params: TemplateFilter): Promise<ApiResponse<{ list: MessageTemplate[]; total: number; page: number; limit: number }>> {
    return request.get('/admin/message-templates', { params })
  },

  getSelectable(category?: string): Promise<ApiResponse<MessageTemplate[]>> {
    return request.get('/admin/message-templates/selectable', { params: { category } })
  },

  detail(id: number): Promise<ApiResponse<MessageTemplate>> {
    return request.get(`/admin/message-templates/${id}`)
  },

  create(data: Partial<MessageTemplate>): Promise<ApiResponse<MessageTemplate>> {
    return request.post('/admin/message-templates', data)
  },

  update(id: number, data: Partial<MessageTemplate>): Promise<ApiResponse> {
    return request.put(`/admin/message-templates/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/message-templates/${id}`)
  },
}
