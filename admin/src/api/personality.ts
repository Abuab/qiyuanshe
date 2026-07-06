import request from './request'
import type { ApiResponse } from './request'

// ==================== 维度 ====================

export interface PersonalityDimensionItem {
  id: number
  code: string
  name: string
  directionAKey: string
  directionALabel: string
  directionBKey: string
  directionBLabel: string
  icon: string | null
  sort: number
  isEnabled: number
  createdAt: string
  updatedAt: string
}

// ==================== 选项 ====================

export interface PersonalityOptionItem {
  id?: number
  optionLabel: string
  content: string
  directionKey: string
  score: number
  sort?: number
}

// ==================== 题目 ====================

export interface PersonalityQuestionItem {
  id: number
  content: string
  dimensionId: number
  dimension: PersonalityDimensionItem | null
  sort: number
  isEnabled: number
  options: PersonalityOptionItem[]
  createdAt: string
  updatedAt: string
}

export interface PersonalityQuestionListData {
  items: PersonalityQuestionItem[]
  total: number
}

// ==================== 人格类型 ====================

export interface PersonalityTypeItem {
  id: number
  code: string
  name: string
  nickname: string | null
  summary: string | null
  description: string | null
  radarEnergy: number
  radarInfo: number
  radarDecision: number
  radarLifestyle: number
  matchTypes: string[] | null
  sort: number
  isEnabled: number
  createdAt: string
  updatedAt: string
}

export interface PersonalityTypeListData {
  items: PersonalityTypeItem[]
  total: number
}

export interface PersonalityTypeOption {
  id: number
  code: string
  name: string
  nickname: string | null
}

// ==================== 维度 API ====================

export const personalityDimensionApi = {
  list(): Promise<ApiResponse<PersonalityDimensionItem[]>> {
    return request.get('/admin/personality/dimensions')
  },
  enabled(): Promise<ApiResponse<PersonalityDimensionItem[]>> {
    return request.get('/admin/personality/dimensions/enabled')
  },
  create(data: Partial<PersonalityDimensionItem>): Promise<ApiResponse<PersonalityDimensionItem>> {
    return request.post('/admin/personality/dimensions', data)
  },
  update(id: number, data: Partial<PersonalityDimensionItem>): Promise<ApiResponse<PersonalityDimensionItem>> {
    return request.put(`/admin/personality/dimensions/${id}`, data)
  },
  setStatus(id: number, isEnabled: number): Promise<ApiResponse> {
    return request.put(`/admin/personality/dimensions/${id}/status`, { isEnabled })
  },
  reorder(id: number, sort: number): Promise<ApiResponse> {
    return request.put(`/admin/personality/dimensions/${id}/reorder`, { sort })
  },
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/personality/dimensions/${id}`)
  },
}

// ==================== 题目 API ====================

export const personalityQuestionApi = {
  getList(params?: {
    page?: number
    limit?: number
    keyword?: string
    dimensionId?: number
    isEnabled?: number
  }): Promise<ApiResponse<PersonalityQuestionListData>> {
    return request.get('/admin/personality/questions', { params })
  },
  getOne(id: number): Promise<ApiResponse<PersonalityQuestionItem>> {
    return request.get(`/admin/personality/questions/${id}`)
  },
  create(data: {
    content: string
    dimensionId: number
    sort?: number
    isEnabled?: number
    options: PersonalityOptionItem[]
  }): Promise<ApiResponse<PersonalityQuestionItem>> {
    return request.post('/admin/personality/questions', data)
  },
  update(id: number, data: {
    content: string
    dimensionId: number
    sort?: number
    isEnabled?: number
    options: PersonalityOptionItem[]
  }): Promise<ApiResponse<PersonalityQuestionItem>> {
    return request.put(`/admin/personality/questions/${id}`, data)
  },
  setStatus(id: number, isEnabled: number): Promise<ApiResponse> {
    return request.put(`/admin/personality/questions/${id}/status`, { isEnabled })
  },
  reorder(id: number, sort: number): Promise<ApiResponse> {
    return request.put(`/admin/personality/questions/${id}/reorder`, { sort })
  },
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/personality/questions/${id}`)
  },
  batchRemove(ids: number[]): Promise<ApiResponse> {
    return request.post('/admin/personality/questions/batch-delete', { ids })
  },
  batchSetStatus(ids: number[], isEnabled: number): Promise<ApiResponse> {
    return request.post('/admin/personality/questions/batch-status', { ids, isEnabled })
  },
}

// ==================== 人格类型 API ====================

export const personalityTypeApi = {
  getList(params?: {
    page?: number
    limit?: number
    keyword?: string
    isEnabled?: number
  }): Promise<ApiResponse<PersonalityTypeListData>> {
    return request.get('/admin/personality/types', { params })
  },
  options(): Promise<ApiResponse<PersonalityTypeOption[]>> {
    return request.get('/admin/personality/types/options')
  },
  getOne(id: number): Promise<ApiResponse<PersonalityTypeItem>> {
    return request.get(`/admin/personality/types/${id}`)
  },
  create(data: Partial<PersonalityTypeItem>): Promise<ApiResponse<PersonalityTypeItem>> {
    return request.post('/admin/personality/types', data)
  },
  update(id: number, data: Partial<PersonalityTypeItem>): Promise<ApiResponse<PersonalityTypeItem>> {
    return request.put(`/admin/personality/types/${id}`, data)
  },
  setStatus(id: number, isEnabled: number): Promise<ApiResponse> {
    return request.put(`/admin/personality/types/${id}/status`, { isEnabled })
  },
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/personality/types/${id}`)
  },
}
