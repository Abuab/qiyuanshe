import request from './request'

export function getPropertyAuthList(params: {
  page?: number
  pageSize?: number
  status?: number | string
}) {
  return request({
    url: '/property-auth/admin/list',
    method: 'get',
    params,
  })
}

export function auditPropertyAuth(data: {
  id: number
  status: number
  rejectReason?: string
}) {
  return request({
    url: '/property-auth/admin/audit',
    method: 'post',
    data,
  })
}
