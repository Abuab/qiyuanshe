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

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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

    if (data.success === false) {
      if (data.code === 401) {
        handleUnauthorized()
        return Promise.reject(new Error(data.message || '未授权'))
      }

      ElMessage.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }

    return data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          handleUnauthorized()
          break
        case 403:
          ElMessage.error(data.message || '没有权限')
          break
        case 404:
          ElMessage.error(data.message || '资源不存在')
          break
        case 500:
          ElMessage.error(data.message || '服务器错误')
          break
        case 422:
          ElMessage.error(data.message || '参数验证失败')
          break
        default:
          ElMessage.error(data.message || '网络错误')
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
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')

  ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      router.push({ name: 'Login' })
    })
    .catch(() => {})
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
