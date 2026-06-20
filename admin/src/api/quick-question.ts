import request from './request'
import type { ApiResponse } from './request'

export interface QuickQuestionCategoryItem {
  id: number
  name: string
  sort: number
  isEnabled: number
  createdAt: string
  updatedAt: string
}

export interface QuickQuestionItem {
  id: number
  content: string
  categoryId: number | null
  category: QuickQuestionCategoryItem | null
  sort: number
  isEnabled: number
  clickCount: number
  createdAt: string
  updatedAt: string
}

export interface QuickQuestionListData {
  items: QuickQuestionItem[]
  total: number
}

export const adminQuickQuestion = {
  /** 获取快捷问题列表 */
  getList(params?: {
    page?: number
    limit?: number
    keyword?: string
    categoryId?: number
    isEnabled?: number
  }): Promise<ApiResponse<QuickQuestionListData>> {
    return request.get('/admin/quick-questions', { params })
  },

  /** 获取单条 */
  getOne(id: number): Promise<ApiResponse<QuickQuestionItem>> {
    return request.get(`/admin/quick-questions/${id}`)
  },

  /** 新增 */
  create(data: {
    content: string
    categoryId?: number | null
    sort?: number
    isEnabled?: number
  }): Promise<ApiResponse<QuickQuestionItem>> {
    return request.post('/admin/quick-questions', data)
  },

  /** 编辑 */
  update(id: number, data: {
    content?: string
    categoryId?: number | null
    sort?: number
    isEnabled?: number
  }): Promise<ApiResponse<QuickQuestionItem>> {
    return request.put(`/admin/quick-questions/${id}`, data)
  },

  /** 删除 */
  remove(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/quick-questions/${id}`)
  },

  /** 批量删除 */
  batchRemove(ids: number[]): Promise<ApiResponse> {
    return request.post('/admin/quick-questions/batch-delete', { ids })
  },

  /** 批量启用/禁用 */
  batchSetStatus(ids: number[], isEnabled: number): Promise<ApiResponse> {
    return request.post('/admin/quick-questions/batch-status', { ids, isEnabled })
  },

  /** 重新排序 */
  reorder(id: number, sort: number): Promise<ApiResponse> {
    return request.put(`/admin/quick-questions/${id}/reorder`, { sort })
  },

  /** 获取点击统计 */
  getClickStats(period?: string): Promise<ApiResponse<QuickQuestionItem[]>> {
    return request.get('/admin/quick-questions/stats/click', { params: { period } })
  },

  // ========== 分类管理 ==========

  /** 获取分类列表 */
  getCategories(): Promise<ApiResponse<QuickQuestionCategoryItem[]>> {
    return request.get('/admin/quick-questions/categories/list')
  },

  /** 新增分类 */
  createCategory(data: { name: string; sort?: number }): Promise<ApiResponse<QuickQuestionCategoryItem>> {
    return request.post('/admin/quick-questions/categories', data)
  },

  /** 编辑分类 */
  updateCategory(id: number, data: { name?: string; sort?: number; isEnabled?: number }): Promise<ApiResponse<QuickQuestionCategoryItem>> {
    return request.put(`/admin/quick-questions/categories/${id}`, data)
  },

  /** 删除分类 */
  deleteCategory(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/quick-questions/categories/${id}`)
  },
}
