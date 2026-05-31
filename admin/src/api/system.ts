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

  upload(data: FormData): Promise<ApiResponse<{ url: string }>> {
    return request.post('/admin/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadCert(data: FormData): Promise<ApiResponse<{ path: string }>> {
    return request.post('/admin/upload/cert', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
