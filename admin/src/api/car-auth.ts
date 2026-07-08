import request from './request'

export function getCarAuthList(params: {
  page?: number
  pageSize?: number
  status?: number | string
}) {
  return request({
    url: '/car-auth/admin/list',
    method: 'get',
    params,
  })
}

export function auditCarAuth(data: {
  id: number
  status: number
  rejectReason?: string
}) {
  return request({
    url: '/car-auth/admin/audit',
    method: 'post',
    data,
  })
}
