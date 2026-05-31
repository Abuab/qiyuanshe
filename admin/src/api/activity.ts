import request from './request'
import type { ApiResponse } from './request'

export interface Activity {
  id: number
  title: string
  subtitle?: string
  coverImage: string
  content?: string
  activityType: string
  signUpEndTime?: string
  startTime: string
  endTime: string
  location?: string
  maxParticipants: number
  currentParticipants: number
  status: number
  isActive: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ActivityFilter {
  page?: number
  limit?: number
  keyword?: string
  activityType?: string
  status?: number
}

export interface ActivityListResponse {
  list: Activity[]
  page: number
  limit: number
  total: number
}

export interface ActivitySignup {
  id: number
  activityId: number
  userId: number
  realName?: string
  phone?: string
  remark?: string
  status: number
  createdAt: string
  nickname?: string
  userAvatar?: string
}

export interface SignupListResponse {
  list: ActivitySignup[]
  page: number
  limit: number
  total: number
}

export interface SignupStats {
  total: number
  pending: number
  confirmed: number
}

export const adminActivity = {
  list(params: ActivityFilter): Promise<ApiResponse<ActivityListResponse>> {
    return request.get('/admin/activities', { params })
  },

  detail(id: number): Promise<ApiResponse<Activity>> {
    return request.get(`/admin/activities/${id}`)
  },

  create(data: Partial<Activity>): Promise<ApiResponse> {
    return request.post('/admin/activities', data)
  },

  update(id: number, data: Partial<Activity>): Promise<ApiResponse> {
    return request.put(`/admin/activities/${id}`, data)
  },

  updateStatus(id: number, status: number): Promise<ApiResponse> {
    return request.put(`/admin/activities/${id}/status`, { status })
  },

  delete(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/activities/${id}`)
  },

  getSignups(id: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<SignupListResponse>> {
    return request.get(`/admin/activities/${id}/signups`, { params })
  },

  getSignupStats(id: number): Promise<ApiResponse<SignupStats>> {
    return request.get(`/admin/activities/${id}/signups/stats`)
  },

  confirmSignup(id: number): Promise<ApiResponse> {
    return request.put(`/admin/signups/${id}/confirm`)
  },

  cancelSignup(id: number): Promise<ApiResponse> {
    return request.put(`/admin/signups/${id}/cancel`)
  },

  upload(data: FormData): Promise<ApiResponse<{ url: string }>> {
    return request.post('/admin/upload', data)
  },
}
