import { logger } from './logger'
import { secureStorage } from './crypto'

/**
 * 直接从 storage 读取 token（避免循环依赖 auth.ts → request.ts）
 */
function getToken(): string {
  return secureStorage.getToken()
}

/**
 * 生产环境 API 地址（兜底默认值）
 * 优先级：storage 缓存 > build-time VITE_API_BASE_URL > 此常量
 */
const DEFAULT_BASE_URL = 'http://150.158.130.152:3000/api'
const DEFAULT_SERVER_URL = 'http://150.158.130.152:3000'
function resolveBaseUrl(): string {
  const storageUrl = uni.getStorageSync('api_base_url') as string | undefined
  if (storageUrl) return storageUrl

  // import.meta.env 在 uni-app Vite 构建中可用，ts 需 declare
  const viteEnv = (import.meta as unknown as Record<string, Record<string, string>>).env
  if (viteEnv?.VITE_API_BASE_URL) return viteEnv.VITE_API_BASE_URL

  return DEFAULT_BASE_URL
}

const BASE_URL = resolveBaseUrl()
const TIMEOUT = 15000
const MAX_RETRIES = 2

export const getBaseUrl = (): string => resolveBaseUrl()

/** 获取服务器根地址（不含 /api），用于拼接图片路径 */
export const getServerBaseUrl = (): string => {
  const base = resolveBaseUrl()
  return base.replace(/\/api\/?$/, '')
}

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, unknown>
  header?: Record<string, string>
  retryCount?: number
  /** 单次请求超时（毫秒），不传则使用全局默认 TIMEOUT */
  timeout?: number
}

/** HTTP 成功状态码范围 */
function isHttpSuccess(statusCode: number): boolean {
  return (statusCode >= 200 && statusCode < 300) || statusCode === 304
}

/** 从 HTTP 状态码生成用户可读的错误信息 */
function statusMessage(statusCode: number): string {
  const map: Record<number, string> = {
    400: '请求参数有误',
    401: '登录已过期',
    403: '权限不足',
    404: '资源不存在',
    422: '提交数据验证失败',
    500: '服务器繁忙',
    502: '服务器维护中',
    503: '服务暂不可用',
  }
  return map[statusCode] || `请求异常(${statusCode})`
}

/** 统一处理 401 */
function handleUnauthorized(tokenWasPresent: boolean): void {
  // 场景1：请求根本没带 token → 未登录，引导登录（不清除不存在的 token）
  if (!tokenWasPresent) {
    uni.showToast({ title: '请先登录', icon: 'none', duration: 2000 })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1500)
    return
  }

  // 场景2：带了 token 但后端返回 401 → token 过期/被撤销/密钥变更
  secureStorage.clearAll()

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]?.route
  if (currentPage !== 'pages/login/index') {
    uni.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none',
      duration: 2000,
    })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 1500)
  }
}

/** 标记是否正在刷新 token，防止并发刷新 */
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/** 通知等待中的请求：token 已刷新，传入新 token */
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

/** 通知等待中的请求：刷新失败 */
function onRefreshFailed() {
  refreshSubscribers = []
}

/** 尝试用 refresh token 刷新 access token，返回新的 access token 或 null */
function tryRefreshToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const refreshToken = secureStorage.getRefreshToken()
    if (!refreshToken) {
      resolve(null)
      return
    }

    uni.request({
      url: BASE_URL + '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
      success: (res: any) => {
        const body = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as Record<string, unknown>
        const newAccess = (body.data as Record<string, unknown>)?.accessToken as string | undefined
          || (body.accessToken as string | undefined)
        if (newAccess && res.statusCode >= 200 && res.statusCode < 300) {
          secureStorage.setToken(newAccess)
          const newRefresh = (body.data as Record<string, unknown>)?.refreshToken as string | undefined
            || (body.refreshToken as string | undefined)
          if (newRefresh) secureStorage.setRefreshToken(newRefresh)
          resolve(newAccess)
          return
        }
        resolve(null)
      },
      fail: () => {
        resolve(null)
      },
    })
  })
}

/** 处理 401：先尝试刷新 token，成功则重试原请求，失败则清空登录态 */
function handle401AndRetry(
  fullUrl: string,
  method: string,
  data: Record<string, unknown>,
  header: Record<string, string>,
  retryCount: number,
  hadToken: boolean,
  resolve: (value: any) => void,
  reject: (reason: any) => void,
): void {
  if (!hadToken) {
    handleUnauthorized(false)
    reject(new Error('Unauthorized'))
    return
  }

  // 如果正在刷新 token，加入等待队列
  if (isRefreshing) {
    refreshSubscribers.push((newToken: string) => {
      retryRequest(fullUrl, method, data, header, retryCount, newToken, resolve, reject)
    })
    return
  }

  isRefreshing = true
  tryRefreshToken().then((newToken) => {
    if (newToken) {
      onTokenRefreshed(newToken)
      retryRequest(fullUrl, method, data, header, retryCount, newToken, resolve, reject)
    } else {
      onRefreshFailed()
      handleUnauthorized(true)
      reject(new Error('Unauthorized'))
    }
    isRefreshing = false
  })
}

/** 用新 token 重试请求 */
function retryRequest(
  fullUrl: string,
  method: string,
  data: Record<string, unknown>,
  header: Record<string, string>,
  retryCount: number,
  newToken: string,
  resolve: (value: any) => void,
  reject: (reason: any) => void,
): void {
  const retryHeader: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
    Authorization: `Bearer ${newToken}`,
  }

  uni.request({
    url: fullUrl,
    method: method as any,
    data,
    header: retryHeader,
    timeout: TIMEOUT,
    success: (res: any) => {
      const response = res as UniApp.RequestSuccessCallbackResult
      const statusCode = response.statusCode

      if (statusCode === 401) {
        // 刷新后的 token 仍然 401，彻底清除登录态
        handleUnauthorized(true)
        reject(new Error('Unauthorized'))
        return
      }

      if (!isHttpSuccess(statusCode)) {
        const responseBody = response.data as Record<string, unknown> | undefined
        const bizMsg = (responseBody?.msg || responseBody?.message) as string | undefined
        const msg = bizMsg || statusMessage(statusCode)
        uni.showToast({ title: msg, icon: 'none', duration: 2000 })
        reject(new Error(msg))
        return
      }

      const result = response.data as Record<string, unknown> | undefined
      if (!result) { resolve({} as any); return }

      const code = result.code as number | undefined
      const success = code === 0 || code === 200 || result.success === true
      if (success) {
        resolve((result.data !== undefined ? result.data : result) as any)
      } else {
        const bizMsg = (result.msg || result.message || '请求失败') as string
        uni.showToast({ title: bizMsg, icon: 'none', duration: 2000 })
        reject(new Error(bizMsg))
      }
    },
    fail: (err: any) => {
      logger.error(`[request:retry] ${method} ${fullUrl} 失败:`, err)
      uni.showToast({ title: '网络连接失败，请检查网络', icon: 'none', duration: 2000 })
      reject(new Error('Network Error'))
    },
  })
}

const request = <T = unknown>(options: RequestOptions): Promise<T> => {
  const { url, method = 'GET', data = {}, header = {}, retryCount = 0, timeout } = options
  const requestTimeout = timeout || TIMEOUT
  const fullUrl = url.startsWith('http') ? url : BASE_URL + url
  const token = getToken()

  return new Promise((resolve, reject) => {
    const requestHeader: Record<string, string> = {
      'Content-Type': 'application/json',
      ...header,
    }
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`
    }

    uni.request({
      url: fullUrl,
      method: method as any,
      data,
      header: requestHeader,
      timeout: requestTimeout,
      success: (res: any) => {
        const response = res as UniApp.RequestSuccessCallbackResult
        const statusCode = response.statusCode

        // ---- 401 自动刷新 token ----
        if (statusCode === 401) {
          handle401AndRetry(fullUrl, method, data, header, retryCount, !!token, resolve, reject)
          return
        }

        // ---- 非成功状态码 ----
        if (!isHttpSuccess(statusCode)) {
          // 优先读取后端返回的真实错误信息
          const responseBody = response.data as Record<string, unknown> | undefined
          const bizMsg = (responseBody?.msg || responseBody?.message) as string | undefined
          const msg = bizMsg || statusMessage(statusCode)
          if (statusCode !== 401) {
            uni.showToast({ title: msg, icon: 'none', duration: 2000 })
          }
          reject(new Error(msg))
          return
        }

        // ---- 解析业务响应体 ----
        const result = response.data as Record<string, unknown> | undefined
        if (!result) {
          resolve({} as T)
          return
        }

        // 兼容多种后端响应格式：
        // NestJS Result.success() → { code: 200, data: ... }
        // 业务层直接返回     → { code: 0, data: ... } 或 { success: true, ... }
        const code = result.code as number | undefined
        const success = code === 0 || code === 200 || result.success === true

        if (success) {
          // 提取 data 字段（如果存在），否则返回整个 result
          resolve((result.data !== undefined ? result.data : result) as T)
        } else {
          const bizMsg = (result.msg || result.message || '请求失败') as string
          uni.showToast({ title: bizMsg, icon: 'none', duration: 2000 })
          reject(new Error(bizMsg))
        }
      },
      fail: (err: any) => {
        logger.error(`[request] ${method} ${url} 失败:`, err)

        // ---- 重试（仅网络错误） ----
        const isNetworkError =
          err.errMsg?.includes('timeout') ||
          err.errMsg?.includes('fail') ||
          err.errMsg?.includes('abort')

        if (isNetworkError && retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000 // 指数退避：1s, 2s
          logger.info(`[request] 第${retryCount + 1}次重试，${delay}ms后...`)
          setTimeout(() => {
            request<T>({ ...options, retryCount: retryCount + 1 })
              .then(resolve)
              .catch(reject)
          }, delay)
          return
        }

        const errorMsg = err.errMsg?.includes('timeout')
          ? '请求超时，请检查网络'
          : '网络连接失败，请检查网络'
        uni.showToast({ title: errorMsg, icon: 'none', duration: 2000 })
        reject(new Error('Network Error'))
      },
    })
  })
}

/** GET 请求 */
export const get = <T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  header?: Record<string, string>,
): Promise<T> => request<T>({ url, method: 'GET', data, header })

/** POST 请求 */
export const post = <T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  header?: Record<string, string>,
): Promise<T> => request<T>({ url, method: 'POST', data, header })

/** PUT 请求 */
export const put = <T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  header?: Record<string, string>,
): Promise<T> => request<T>({ url, method: 'PUT', data, header })

/** DELETE 请求 */
export const del = <T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  header?: Record<string, string>,
): Promise<T> => request<T>({ url, method: 'DELETE', data, header })

/** PATCH 请求 */
export const patch = <T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  header?: Record<string, string>,
): Promise<T> => request<T>({ url, method: 'PATCH', data, header })

export default request
