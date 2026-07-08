import request from './request'

export const storeCertApi = {
  /** 所有用户列表（左侧候选） */
  getUsers(params: { page?: number; limit?: number; keyword?: string }) {
    return request.get('/admin/store-cert/users', { params })
  },
  /** 已认证用户列表（右侧已选） */
  getMembers() {
    return request.get('/admin/store-cert/members')
  },
  /** 添加用户到店认证 */
  addMember(userId: number) {
    return request.post(`/admin/store-cert/members/${userId}`)
  },
  /** 移除用户到店认证 */
  removeMember(userId: number) {
    return request.delete(`/admin/store-cert/members/${userId}`)
  },
}
