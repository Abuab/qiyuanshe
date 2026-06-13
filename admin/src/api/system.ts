import request from './request'
import type { ApiResponse } from './request'

export interface SystemConfigs {
  basic?: Record<string, any>
  share?: Record<string, any>
  vip?: Record<string, any>
  payment?: Record<string, any>
  audit?: Record<string, any>
}

export const system = {
  getConfigs(): Promise<ApiResponse<SystemConfigs>> {
    return request.get('/admin/system/configs')
  },

  saveConfigs(configs: SystemConfigs): Promise<ApiResponse> {
    return request.put('/admin/system/configs', configs)
  },

  getConfig(key: string): Promise<ApiResponse<string>> {
    return request.get(`/admin/system/config/${key}`)
  },
}

export const adminSystem = {
  saveConfigs(configs: SystemConfigs): Promise<ApiResponse> {
    return request.put('/admin/system/configs', configs)
  },

  updateConfig(key: string, value: string): Promise<ApiResponse> {
    return request.put(`/admin/system/config/${key}`, { value })
  },

  batchUpdateConfigs(configs: Record<string, string>): Promise<ApiResponse> {
    return request.put('/admin/system/configs', { configs })
  },

  getConfigByKey(key: string): Promise<ApiResponse<string>> {
    return request.get(`/admin/system/config/${key}`)
  },

  updateProfile(data: { nickname?: string; avatar?: string; password?: string }): Promise<ApiResponse> {
    return request.put('/admin/profile', data)
  },

  upload(data: FormData): Promise<ApiResponse<{ url: string }>> {
    return request.post('/admin/upload', data)
  },

  uploadCert(data: FormData): Promise<ApiResponse<{ path: string }>> {
    return request.post('/admin/upload/cert', data)
  },

  resetPassword(data: { username: string; newPassword: string; adminKey: string }): Promise<ApiResponse> {
    return request.post('/admin/reset-password', data)
  },

  // 红娘评语
  getMatchmakerComments(page = 1, limit = 20): Promise<ApiResponse> {
    return request.get('/admin/matchmaker-comments', { params: { page, limit } })
  },
  createMatchmakerComment(data: any): Promise<ApiResponse> {
    return request.post('/admin/matchmaker-comments', data)
  },
  deleteMatchmakerComment(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/matchmaker-comments/${id}`)
  },

  // 圈子管理
  getCircles(): Promise<ApiResponse> {
    return request.get('/admin/circles')
  },
  createCircle(data: any): Promise<ApiResponse> {
    return request.post('/admin/circles', data)
  },
  updateCircle(id: number, data: any): Promise<ApiResponse> {
    return request.put(`/admin/circles/${id}`, data)
  },
  deleteCircle(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/circles/${id}`)
  },

  // 帖子审核
  getCirclePosts(page = 1, limit = 20): Promise<ApiResponse> {
    return request.get('/admin/circles/posts', { params: { page, limit } })
  },
  auditCirclePost(id: number, status: number): Promise<ApiResponse> {
    return request.put(`/admin/circles/posts/${id}/audit`, { status })
  },
  deleteCirclePost(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/circles/posts/${id}`)
  },

  // 成功案例
  getSuccessCases(page = 1, limit = 20): Promise<ApiResponse> {
    return request.get('/admin/success-cases', { params: { page, limit } })
  },
  createSuccessCase(data: any): Promise<ApiResponse> {
    return request.post('/admin/success-cases', data)
  },
  updateSuccessCase(id: number, data: any): Promise<ApiResponse> {
    return request.put(`/admin/success-cases/${id}`, data)
  },
  deleteSuccessCase(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/success-cases/${id}`)
  },
}

export const mfaApi = {
  setupTotp: (): Promise<ApiResponse<{ qrCodeUrl: string; secret: string }>> => request.post('/admin/mfa/setup'),
  verifyTotp: (code: string): Promise<ApiResponse> => request.post('/admin/mfa/verify-totp', { code }),
  disableMfa: (code: string): Promise<ApiResponse> => request.post('/admin/mfa/disable', { code }),
}
