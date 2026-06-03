import { getToken } from './auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const TIMEOUT = 15000
const MAX_RETRIES = 1

export const getBaseUrl = () => BASE_URL

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  retryCount?: number
}

interface ResponseData {
  code: number
  msg: string
  data: any
}

const request = <T = any>(options: RequestOptions): Promise<T> => {
  const { url, method = 'GET', data = {}, header = {}, retryCount = 0 } = options
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
      method,
      data,
      header: requestHeader,
      timeout: TIMEOUT,
      success: (res: any) => {
        const response = res as UniApp.RequestSuccessCallbackResult

        if (response.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.removeStorageSync('refreshToken')
          
          // 避免在当前已是登录页时重复跳转
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]?.route
          if (currentPage !== 'pages/login/index') {
            uni.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none',
              duration: 2000
            })
            setTimeout(() => {
              uni.reLaunch({
                url: '/pages/login/index'
              })
            }, 1500)
          }
          reject(new Error('Unauthorized'))
          return
        }

        if (response.statusCode === 403) {
          uni.showToast({
            title: '权限不足',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('Forbidden'))
          return
        }

        if (response.statusCode === 500) {
          uni.showToast({
            title: '服务器错误，请稍后重试',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('Server Error'))
          return
        }

        if (response.statusCode !== 200) {
          uni.showToast({
            title: '网络请求失败',
            icon: 'none',
            duration: 2000
          })
          reject(new Error('Request Failed'))
          return
        }

        const result = response.data as any

        // 兼容多种后端响应格式
        // NestJS Result.success(): { code: 200, data: ... }
        // 业务层直接返回: { code: 0, data: ... }
        // 不带code但有success: { success: true, data: ... }
        const success = result.code === 0 || result.code === 200 || result.success === true
        if (success) {
          resolve((result.data !== undefined ? result.data : result) as T)
        } else {
          uni.showToast({
            title: result.msg || result.message || '请求失败',
            icon: 'none',
            duration: 2000
          })
          reject(new Error(result.msg || result.message || 'Request Failed'))
        }
      },
      fail: (err: any) => {
        console.error('Request failed:', err)

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying request... (${retryCount + 1}/${MAX_RETRIES})`)
          request<T>({
            url,
            method,
            data,
            header,
            retryCount: retryCount + 1
          }).then(resolve).catch(reject)
          return
        }

        uni.showToast({
          title: '网络连接失败，请检查网络',
          icon: 'none',
          duration: 2000
        })
        reject(new Error('Network Error'))
      }
    })
  })
}

export const get = <T = any>(url: string, data?: any, header?: Record<string, string>): Promise<T> => {
  return request<T>({ url, method: 'GET', data, header })
}

export const post = <T = any>(url: string, data?: any, header?: Record<string, string>): Promise<T> => {
  return request<T>({ url, method: 'POST', data, header })
}

export const put = <T = any>(url: string, data?: any, header?: Record<string, string>): Promise<T> => {
  return request<T>({ url, method: 'PUT', data, header })
}

export const del = <T = any>(url: string, data?: any, header?: Record<string, string>): Promise<T> => {
  return request<T>({ url, method: 'DELETE', data, header })
}

export default request
