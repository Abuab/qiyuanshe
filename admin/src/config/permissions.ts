import { ADMIN_ROLE } from './constants'
import type { RouteRecordRaw } from 'vue-router'

/**
 * 角色 → 可访问路由前缀白名单
 *
 * 路由守卫在 beforeEach 中按前缀匹配：
 * - super_admin 可访问所有页面
 * - 其他角色只能访问其白名单中定义的前缀路径
 * - 未匹配到的路由一律拒绝访问，跳转 /dashboard 并弹出提示
 */
export const ROLE_ROUTE_MAP: Record<string, string[]> = {
  [ADMIN_ROLE.SUPER_ADMIN]: ['*'],

  [ADMIN_ROLE.MATCHMAKER]: [
    '/dashboard',
    '/user/list',
    '/user/detail',
    '/user/deactivated',
    '/matchmaker',
    '/matchmaker-comments',
    '/question',
    '/activity',
    '/personality',
    '/profile',
  ],

  [ADMIN_ROLE.OPERATOR]: [
    '/dashboard',
    '/user',
    '/question',
    '/audit',
    '/audit-log',
    '/single-promise',
    '/education-auth',
    '/property-auth',
    '/car-auth',
    '/payment',
    '/activity',
    '/chat',
    '/guide',
    '/profile',
  ],

  [ADMIN_ROLE.READONLY]: [
    '/dashboard',
    '/user/list',
    '/user/detail',
    '/user/deactivated',
    '/question',
    '/activity',
    '/profile',
  ],
}

/** 判断某个路径是否在角色的白名单中 */
export function isRouteAllowed(role: string, path: string): boolean {
  const allowed = ROLE_ROUTE_MAP[role]
  if (!allowed) return false
  if (allowed.includes('*')) return true
  return allowed.some((prefix) => path.startsWith(prefix))
}

/** 路由上的权限元信息（供菜单和按钮级权限使用） */
export type RoutePermission = 'user:export' | 'user:batch-delete' | 'user:delete' | 'payment:refund' | 'audit:approve' | 'audit:reject'

/** 扩展 RouteMeta 类型 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    /** 所属角色 */
    roles?: string[]
    /** 所需的权限标识（按钮级别） */
    permissions?: RoutePermission[]
  }
}
