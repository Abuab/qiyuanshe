import { getToken } from './auth'

const BASE_URL = 'https://api.lingtong.com'
const TIMEOUT = 15000
const MAX_RETRIES = 1

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

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': getToken() ? `Bearer ${getToken()}` : '',
        ...header
      },
      timeout: TIMEOUT,
      success: (res: any) => {
        const response = res as UniApp.RequestSuccessCallbackResult

        if (response.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.removeStorageSync('refreshToken')
          uni.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 2000
          })
          uni.reLaunch({
            url: '/pages/login/index'
          })
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

        const result = response.data as ResponseData

        if (result.code === 0) {
          resolve(result.data as T)
        } else {
          uni.showToast({
            title: result.msg || '请求失败',
            icon: 'none',
            duration: 2000
          })
          reject(new Error(result.msg || 'Request Failed'))
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
