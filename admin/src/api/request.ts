import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '../router'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const instance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isUnauthorizedHandling = false
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  async (response) => {
    const { data, config } = response

    if (data === null || data === undefined) {
      return { success: true, data: null }
    }

    // 检测 NestJS 标准错误响应（statusCode / error 字段）
    const isNestError = data.statusCode !== undefined && data.statusCode >= 400
    if (isNestError) {
      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }

    const isWrapped = data.code !== undefined && data.data !== undefined
    const result = isWrapped ? data.data : data

    const isError = (data.code !== undefined && data.code !== 200) || (result && typeof result === 'object' && !Array.isArray(result) && result.success === false)
    if (isError) {
      const is401 = data.code === 401 || (result && typeof result === 'object' && !Array.isArray(result) && result.code === 401)
      if (is401) {
        // 如果是 refresh 接口本身返回 401，直接跳登录（避免死循环）
        if (config.url?.includes('/admin/auth/refresh')) {
          handleUnauthorized()
          return Promise.reject(new Error(result?.message || data.message || '未授权'))
        }

        const newToken = await tryRefreshToken()
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`
          return instance(config)
        }

        handleUnauthorized()
        return Promise.reject(new Error(result?.message || data.message || '未授权'))
      }

      ElMessage.error(result?.message || data.message || '请求失败')
      return Promise.reject(new Error(result?.message || data.message))
    }

    if (isWrapped) {
      return { ...data, success: true, ...result }
    }
    return { ...data, success: true }
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      const responseData = data.data || data

      if (status === 401) {
        // 尝试刷新 token，成功则重试原请求
        return tryRefreshToken().then((newToken) => {
          if (newToken) {
            const originalRequest = error.config
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return instance(originalRequest)
          }
          handleUnauthorized()
          return Promise.reject(error)
        })
      }

      switch (status) {
        case 403:
          ElMessage.error(responseData.message || '没有权限')
          break
        case 404:
          ElMessage.error(responseData.message || '资源不存在')
          break
        case 500:
          ElMessage.error(responseData.message || '服务器错误')
          break
        case 422:
          ElMessage.error(responseData.message || '参数验证失败')
          break
        default:
          ElMessage.error(responseData.message || '网络错误')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error(error.message || '请求配置错误')
    }

    return Promise.reject(error)
  }
)

function handleUnauthorized() {
  if (isUnauthorizedHandling) return
  isUnauthorizedHandling = true

  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  localStorage.removeItem('admin_refresh_token')

  import('../store/admin').then(({ useAdminStore }) => {
    const store = useAdminStore()
    store.$patch({ token: '', userInfo: null })
  })

  ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      router.push({ name: 'Login' })
    })
    .catch(() => {})
    .finally(() => {
      isUnauthorizedHandling = false
    })
}

/** 尝试用 refreshToken 刷新 accessToken，返回新 token 或 null */
async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  const refreshToken = localStorage.getItem('admin_refresh_token')
  if (!refreshToken) return null

  isRefreshing = true
  refreshPromise = instance.post('/admin/auth/refresh', { refreshToken })
    .then((res: any) => {
      if (res.success && res.token) {
        localStorage.setItem('admin_token', res.token)
        if (res.refreshToken) {
          localStorage.setItem('admin_refresh_token', res.refreshToken)
        }
        // 同步更新 store 中的 token，避免 WebSocket 等使用过期值
        import('../store/admin').then(({ useAdminStore }) => {
          useAdminStore().token = res.token
        })
        return res.token
      }
      return null
    })
    .catch(() => null)
    .finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

  return refreshPromise
}

export default instance

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
