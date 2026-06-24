import request from './request'
import type { ApiResponse } from './request'

export interface FeedbackItem {
  id: number
  userId: number
  content: string
  images: string[]
  status: number
  createdAt: string
  updatedAt: string
}

export interface FeedbackFilter {
  page?: number
  limit?: number
  status?: number | string
}

export interface FeedbackListResponse {
  list: FeedbackItem[]
  page: number
  limit: number
  total: number
}

export const adminFeedback = {
  list(params: FeedbackFilter): Promise<ApiResponse<FeedbackListResponse>> {
    return request.get('/admin/feedbacks', { params })
  },

  detail(id: number): Promise<ApiResponse<FeedbackItem>> {
    return request.get(`/admin/feedbacks/${id}`)
  },

  process(id: number): Promise<ApiResponse> {
    return request.put(`/admin/feedbacks/${id}/process`)
  },
}
