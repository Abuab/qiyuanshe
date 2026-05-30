import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import router from '../router'

export interface AdminUser {
  id: number
  username: string
  nickname: string
  role: string
  avatar?: string
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const userInfo = ref<AdminUser | null>(null)
  const permissions = ref<string[]>([])
  const isCollapsed = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  function initApp() {
    const savedToken = localStorage.getItem('admin_token')
    const savedUser = localStorage.getItem('admin_user')

    if (savedToken) {
      token.value = savedToken
    }

    if (savedUser) {
      try {
        userInfo.value = JSON.parse(savedUser)
      } catch {
        localStorage.removeItem('admin_user')
      }
    }
  }

  async function login(username: string, password: string, captcha: string, rememberMe: boolean) {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha }),
      })

      const data = await response.json()

      if (data.success) {
        token.value = data.token
        userInfo.value = data.user
        permissions.value = data.permissions || []

        localStorage.setItem('admin_token', data.token)
        localStorage.setItem('admin_user', JSON.stringify(data.user))

        if (rememberMe) {
          localStorage.setItem('admin_remember', 'true')
        }

        ElMessage.success('登录成功')

        const redirect = router.currentRoute.value.query.redirect as string
        router.push(redirect || '/dashboard')
      } else {
        ElMessage.error(data.message || '登录失败')
      }
    } catch (error) {
      console.error('Login error:', error)
      ElMessage.error('网络错误，请稍后重试')
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    permissions.value = []

    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_remember')

    router.push({ name: 'Login' })
    ElMessage.success('已退出登录')
  }

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
  }

  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }

  function updateUserInfo(info: Partial<AdminUser>) {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...info }
      localStorage.setItem('admin_user', JSON.stringify(userInfo.value))
    }
  }

  return {
    token,
    userInfo,
    permissions,
    isCollapsed,
    isLoggedIn,
    initApp,
    login,
    logout,
    toggleSidebar,
    hasPermission,
    updateUserInfo,
  }
})
