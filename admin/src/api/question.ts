import request from './request'
import type { ApiResponse } from './request'

export interface Question {
  id: number
  title: string
  content: string
  type: number
  sortOrder: number
  answerCount: number
  status: number
  createdAt: string
  answers?: Answer[]
}

export interface Answer {
  id: number
  questionId: number
  userId: number
  content: string
  photos?: string[]
  likeCount: number
  status: number
  createdAt: string
  user?: any
  userAvatar?: string
  userNickname?: string
}

export interface QuestionFilter {
  page?: number
  limit?: number
  keyword?: string
  type?: number
  status?: number
}

export interface AnswerFilter {
  page?: number
  limit?: number
  questionId: number
  status?: number
}

export interface QuestionListResponse {
  list: Question[]
  page: number
  limit: number
  total: number
}

export interface AnswerListResponse {
  list: Answer[]
  page: number
  limit: number
  total: number
}

export const adminQuestion = {
  list(params: QuestionFilter): Promise<ApiResponse<QuestionListResponse>> {
    return request.get('/admin/questions', { params })
  },

  detail(id: number): Promise<ApiResponse<Question>> {
    return request.get(`/admin/questions/${id}`)
  },

  create(data: Partial<Question>): Promise<ApiResponse> {
    return request.post('/admin/questions', data)
  },

  update(id: number, data: Partial<Question>): Promise<ApiResponse> {
    return request.put(`/admin/questions/${id}`, data)
  },

  delete(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/questions/${id}`)
  },

  sort(id: number, sortOrder: number): Promise<ApiResponse> {
    return request.put(`/admin/questions/${id}/sort`, { sortOrder })
  },

  getAnswers(questionId: number): Promise<ApiResponse<AnswerListResponse>> {
    return request.get('/admin/questions/answers', { params: { questionId } })
  },

  deleteAnswer(answerId: number): Promise<ApiResponse> {
    return request.delete(`/admin/questions/answers/${answerId}`)
  },
}
