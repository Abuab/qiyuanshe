import request from './request'
import type { ApiResponse } from './request'

export interface SystemConfigs {
  basic?: Record<string, any>
  share?: Record<string, any>
  vip?: Record<string, any>
  payment?: Record<string, any>
  audit?: Record<string, any>
  notify?: Record<string, any>
  intro?: Record<string, any>
  icon?: Record<string, any>
  loveQuotes?: Record<string, any>
  photoAudit?: Record<string, any>
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

  // 区域数据
  getRegionChildren(parentId = 0): Promise<ApiResponse<{ id: number; name: string; level: number; hasChildren: boolean }[]>> {
    return request.get('/region', { params: { parentId } })
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
  getCircleMembers(id: number): Promise<ApiResponse> {
    return request.get(`/admin/circles/${id}/members`)
  },
  addCircleMember(id: number, userId: number): Promise<ApiResponse> {
    return request.post(`/admin/circles/${id}/members`, { userId })
  },
  removeCircleMember(id: number, userId: number): Promise<ApiResponse> {
    return request.delete(`/admin/circles/${id}/members/${userId}`)
  },
  searchUsers(keyword: string): Promise<ApiResponse> {
    return request.get('/admin/circles/users/search', { params: { keyword } })
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

  // 通知日志
  getNotifyLogs(params?: Record<string, any>): Promise<ApiResponse<any>> {
    return request.get('/admin/system/notify-logs', { params })
  },

  // 重试 Webhook 发送
  retryWebhook(id: number): Promise<ApiResponse> {
    return request.post(`/admin/system/retry-webhook/${id}`)
  },

  // 测试 Webhook 连通性
  testWebhook(channel: string, url: string): Promise<ApiResponse> {
    return request.post('/admin/system/test-webhook', { channel, url })
  },

  // 用量限额配置
  getQuotaConfig(): Promise<ApiResponse<any>> {
    return request.get('/admin/system/quota')
  },
  saveQuotaConfig(config: any): Promise<ApiResponse> {
    return request.put('/admin/system/quota', config)
  },
}

export const mfaApi = {
  setupTotp: (): Promise<ApiResponse<{ qrCodeUrl: string; secret: string }>> => request.post('/admin/mfa/setup'),
  verifyTotp: (code: string): Promise<ApiResponse> => request.post('/admin/mfa/verify-totp', { code }),
  disableMfa: (code: string): Promise<ApiResponse> => request.post('/admin/mfa/disable', { code }),
}
