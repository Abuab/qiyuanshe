import request from './request'
import type { ApiResponse } from './request'

export interface DashboardStats {
  totalUsers: number
  todayNewUsers: number
  userGrowth: number
  todayGrowth: number
  vipUsers: number
  todayRevenue: number
  revenueGrowth: number
}

export interface UserTrend {
  date: string
  total: number
  male: number
  female: number
}

export const adminDashboard = {
  getStats(params: { timeRange: string }): Promise<ApiResponse<DashboardStats>> {
    return request.get('/admin/dashboard/stats', { params })
  },

  getUserTrend(params: { timeRange: string }): Promise<ApiResponse<UserTrend[]>> {
    return request.get('/admin/dashboard/user-trend', { params })
  },

  getGenderDistribution(): Promise<ApiResponse<any[]>> {
    return request.get('/admin/dashboard/gender-distribution')
  },

  getAgeDistribution(): Promise<ApiResponse<any[]>> {
    return request.get('/admin/dashboard/age-distribution')
  },

  getRevenueTrend(params: { timeRange: string }): Promise<ApiResponse<any[]>> {
    return request.get('/admin/dashboard/revenue-trend', { params })
  },

  getFunnelData(): Promise<ApiResponse<any[]>> {
    return request.get('/admin/dashboard/funnel')
  },
}
