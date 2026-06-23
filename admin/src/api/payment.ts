import request from './request'
import type { ApiResponse } from './request'

export interface Order {
  id: number
  orderNo: string
  userId: number
  userPhone?: string
  userAvatar?: string
  userNickname?: string
  packageName?: string
  vipLevel: number
  /** 金额（元），后端已从「分」转换 */
  amount: number
  status: number
  payMethod?: string
  payType?: string
  paidAt?: string
  createdAt: string
  payTime?: string
  orderType?: string
}

export interface OrderFilter {
  page?: number
  limit?: number
  orderNo?: string
  userKeyword?: string
  userId?: number
  vipLevel?: number
  status?: number
  startDate?: string
  endDate?: string
  sort?: string
  order?: string
  timeRange?: string
}

export interface StatsParams {
  timeRange?: string
  startDate?: string
  endDate?: string
}

export interface OrderListResponse {
  list: Order[]
  page: number
  limit: number
  total: number
}

export const adminPayment = {
  orders(params: OrderFilter): Promise<ApiResponse<OrderListResponse>> {
    return request.get('/admin/payment/orders', { params })
  },

  orderDetail(id: number): Promise<ApiResponse<Order>> {
    return request.get(`/admin/payment/orders/${id}`)
  },

  refund(id: number, reason: string): Promise<ApiResponse> {
    return request.post(`/admin/payment/refund`, { orderId: id, reason })
  },

  stats(params: StatsParams): Promise<ApiResponse<any>> {
    return request.get('/admin/payment/stats', { params })
  },
}

export const adminOrders = {
  list(params: OrderFilter): Promise<ApiResponse<OrderListResponse>> {
    return request.get('/admin/payment/orders', { params })
  },

  detail(id: number): Promise<ApiResponse<Order>> {
    return request.get(`/admin/payment/orders/${id}`)
  },

  detailByOrderNo(orderNo: string): Promise<ApiResponse<Order>> {
    return request.get(`/admin/payment/orders/${orderNo}`)
  },

  export(params: OrderFilter): Promise<ApiResponse<string>> {
    return request.get('/admin/payment/orders', { params })
  },
}
