import request from './request'
import type { ApiResponse } from './request'

export interface User {
  id: number
  nickname: string
  avatar?: string
  gender: number
  birthYear?: number
  age?: number
  education?: string
  occupation?: string
  height?: number
  weight?: number
  phone?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  maritalStatus?: string
  onlyChild?: string
  whenMarry?: string
  zodiac?: string
  constellation?: string
  hometown?: string
  residence?: string
  mateRequirement?: string
  personalityTags?: string[]
  hopeTaTags?: string[]
  partnerAgeRange?: string
  partnerHeightMin?: string
  partnerEducation?: string
  partnerIncome?: string
  housingRequirement?: string
  partnerMaritalStatus?: string
  acceptChildren?: string
  isRealName: number
  realNameAuth?: number
  educationAuth?: number
  isVip: number
  vipLevel?: number
  vipExpireTime?: string
  status: number
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  tags?: string[]
  openid?: string
  adminRemark?: string
  profileAuditStatus?: string
  photoAuditStatus?: string
}

export interface UserPhoto {
  id: number
  userId: number
  photoUrl: string
  isMain: number
  sortOrder: number
  auditStatus: number
  createdAt: string
}

export interface UserFilter {
  page?: number
  limit?: number
  keyword?: string
  gender?: number
  status?: number
  isVip?: number
  vipLevel?: number
  startDate?: string
  endDate?: string
  sort?: string
  order?: string
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  education?: string
  occupation?: string
  tags?: string[]
  zodiac?: string
  constellation?: string
  onlyChild?: string
  whenMarry?: string
  minMatchCount?: number
  maxMatchCount?: number
}

export interface UserListResponse {
  list: User[]
  page: number
  limit: number
  total: number
}

export interface UpdateVipDto {
  level: number
  days: number
}

export const adminUsers = {
  list(params: UserFilter): Promise<ApiResponse<UserListResponse>> {
    return request.get('/admin/users', { params })
  },

  detail(id: number): Promise<ApiResponse<User>> {
    return request.get(`/admin/users/${id}`)
  },

  create(data: Partial<User>): Promise<ApiResponse> {
    return request.post('/admin/users', data)
  },

  update(id: number, data: Partial<User>): Promise<ApiResponse> {
    return request.put(`/admin/users/${id}`, data)
  },

  updateStatus(id: number, status: number): Promise<ApiResponse> {
    return request.put(`/admin/users/${id}/status`, { status })
  },

  updateVip(id: number, data: UpdateVipDto): Promise<ApiResponse> {
    return request.put(`/admin/users/${id}/vip`, data)
  },

  batchUpdateStatus(ids: number[], status: number): Promise<ApiResponse> {
    return request.put('/admin/users/batch-status', { ids, status })
  },

  delete(id: number): Promise<ApiResponse> {
    return request.delete(`/admin/users/${id}`)
  },

  batchDelete(ids: number[]): Promise<ApiResponse> {
    return request.post('/admin/users/batch-delete', { ids })
  },

  export(params: UserFilter & { ids?: number[] }): Promise<ApiResponse<User[]>> {
    const queryParams: any = { ...params }
    if (params.ids && params.ids.length > 0) {
      queryParams.ids = params.ids.join(',')
    }
    delete queryParams.ids
    return request.get('/admin/users/export', { params: queryParams })
  },

  resetPassword(id: number): Promise<ApiResponse> {
    return request.post(`/admin/users/${id}/reset-password`)
  },

  sendNotification(id: number, content: string): Promise<ApiResponse> {
    return request.post(`/admin/users/${id}/notify`, { content })
  },

  // 用户详情页扩展接口
  getReports(id: number): Promise<ApiResponse<any[]>> {
    return request.get(`/admin/user-profiles/${id}/reports`)
  },

  getBlocks(id: number, page?: number, limit?: number): Promise<ApiResponse<{ list: any[]; total: number; page: number; limit: number }>> {
    return request.get(`/admin/user-profiles/${id}/blocks`, { params: { page, limit } })
  },

  getNotifications(id: number, page?: number, limit?: number): Promise<ApiResponse<{ list: any[]; total: number; page: number; limit: number }>> {
    return request.get(`/admin/user-profiles/${id}/notifications`, { params: { page, limit } })
  },

  sendUserNotification(id: number, data: { title?: string; content: string }): Promise<ApiResponse> {
    return request.post(`/admin/user-profiles/${id}/notifications`, data)
  },

  getUserAnswers(id: number, page?: number, limit?: number): Promise<ApiResponse<{ list: any[]; total: number; page: number; limit: number }>> {
    return request.get(`/admin/user-profiles/${id}/answers`, { params: { page, limit } })
  },

  createUserAnswer(id: number, data: { questionId: number; content: string }): Promise<ApiResponse> {
    return request.post(`/admin/user-profiles/${id}/answers`, data)
  },

  approveAnswer(answerId: number): Promise<ApiResponse> {
    return request.put(`/admin/user-profiles/answers/${answerId}/approve`)
  },

  rejectAnswer(answerId: number, reason?: string): Promise<ApiResponse> {
    return request.put(`/admin/user-profiles/answers/${answerId}/reject`, { reason })
  },

  getMatches(id: number, page?: number, limit?: number): Promise<ApiResponse<{ list: any[]; total: number; page: number; limit: number }>> {
    return request.get(`/admin/user-profiles/${id}/matches`, { params: { page, limit } })
  },

  getReviews(id: number): Promise<ApiResponse<any[]>> {
    return request.get(`/admin/user-profiles/${id}/matchmaker-reviews`)
  },

  createReview(id: number, data: { matchmakerId: number; content?: string; difficulty?: string }): Promise<ApiResponse> {
    return request.post(`/admin/user-profiles/${id}/matchmaker-reviews`, data)
  },

  updateReview(reviewId: number, data: { content?: string; difficulty?: string }): Promise<ApiResponse> {
    return request.put(`/admin/user-profiles/matchmaker-reviews/${reviewId}`, data)
  },

  deleteReview(reviewId: number): Promise<ApiResponse> {
    return request.delete(`/admin/user-profiles/matchmaker-reviews/${reviewId}`)
  },

  getPhotos(id: number): Promise<ApiResponse<UserPhoto[]>> {
    return request.get(`/admin/users/${id}/photos`)
  },

  addUserPhoto(id: number, photoUrl: string): Promise<ApiResponse<UserPhoto>> {
    return request.post(`/admin/users/${id}/photos`, { photoUrl })
  },

  deletePhoto(photoId: number): Promise<ApiResponse> {
    return request.delete(`/admin/users/photos/${photoId}`)
  },

  setMainPhoto(photoId: number): Promise<ApiResponse> {
    return request.put(`/admin/users/photos/${photoId}/main`)
  },

  // 关注管理
  getFollowStats(id: number): Promise<ApiResponse<{ following: number; followers: number }>> {
    return request.get(`/admin/users/${id}/follow-stats`)
  },
  getFollowing(id: number, page = 1, limit = 50): Promise<ApiResponse<{ list: any[]; total: number }>> {
    return request.get(`/admin/users/${id}/admin-following`, { params: { page, limit } })
  },
  getFollowers(id: number, page = 1, limit = 50): Promise<ApiResponse<{ list: any[]; total: number }>> {
    return request.get(`/admin/users/${id}/admin-followers`, { params: { page, limit } })
  },
  addFollow(id: number, data: { targetUserId: number }): Promise<ApiResponse> {
    return request.post(`/admin/users/${id}/admin-follow`, data)
  },
  removeFollow(id: number, targetUserId: number): Promise<ApiResponse> {
    return request.delete(`/admin/users/${id}/admin-follow/${targetUserId}`)
  },
  addFollower(id: number, data: { followerUserId: number }): Promise<ApiResponse> {
    return request.post(`/admin/users/${id}/admin-follower`, data)
  },
  removeFollower(id: number, followerUserId: number): Promise<ApiResponse> {
    return request.delete(`/admin/users/${id}/admin-follow/${followerUserId}`)
  },

  // 喜欢管理
  getLikeStats(id: number): Promise<ApiResponse<{ liked: number; likedBy: number; mutual: number }>> {
    return request.get(`/admin/users/${id}/like-stats`)
  },
  getAdminLikes(id: number, type: string = 'liked', page = 1, limit = 50): Promise<ApiResponse<{ list: any[]; total: number }>> {
    return request.get(`/admin/users/${id}/admin-likes`, { params: { type, page, limit } })
  },
  addAdminLike(id: number, data: { targetUserId: number }): Promise<ApiResponse> {
    return request.post(`/admin/users/${id}/admin-like`, data)
  },
  removeAdminLike(id: number, targetUserId: number): Promise<ApiResponse> {
    return request.delete(`/admin/users/${id}/admin-like/${targetUserId}`)
  },

  searchUsers(keyword: string): Promise<ApiResponse<any[]>> {
    return request.get('/admin/users/search', { params: { keyword } })
  },

  // 浏览记录
  getUserViewDetail(id: number): Promise<ApiResponse<any[]>> {
    return request.get(`/admin/users/${id}/view-detail`)
  },
  getUserVisitorDetail(id: number): Promise<ApiResponse<any[]>> {
    return request.get(`/admin/users/${id}/visitor-detail`)
  },

  // 财务记录
  getUserOrders(id: number): Promise<ApiResponse<{ list: any[]; total: number; stats: { totalPaid: number; orderCount: number; paidCount: number } }>> {
    return request.get(`/admin/users/${id}/orders`)
  },
}
