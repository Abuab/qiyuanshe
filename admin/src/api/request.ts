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
  (response) => {
    const { data } = response

    if (data === null || data === undefined) {
      return { success: true, data: null }
    }

    const isWrapped = data.code !== undefined && data.data !== undefined
    const result = isWrapped ? data.data : data

    const isError = (data.code !== undefined && data.code !== 200) || (result && typeof result === 'object' && !Array.isArray(result) && result.success === false)
    if (isError) {
      if (data.code === 401 || (result && typeof result === 'object' && !Array.isArray(result) && result.code === 401)) {
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

      switch (status) {
        case 401:
          handleUnauthorized()
          break
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

  import('../store/admin').then(({ useAdminStore }) => {
    const store = useAdminStore()
    store.$patch({ token: '', userInfo: null, permissions: [] })
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
