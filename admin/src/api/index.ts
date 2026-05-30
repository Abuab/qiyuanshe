export { default as request } from './request'
export * from './dashboard'
export * from './user'
export * from './payment'
export * from './audit'
export * from './system'
export * from './matchmaker'
export * from './question'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  list?: T[]
  total?: number
  page?: number
  limit?: number
  message?: string
  code?: number
}
