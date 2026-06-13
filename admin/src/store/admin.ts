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
  mfaEnabled?: boolean
  mfaType?: string
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const userInfo = ref<AdminUser | null>(null)
  const permissions = ref<string[]>([])
  const isCollapsed = ref(false)
  const pendingAuditCount = ref(0)

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

  async function login(username: string, password: string, captcha: string, rememberMe: boolean, captchaKey?: string) {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, captcha, captchaKey }),
    })

    const result = await response.json()
    const data = result.data || result

    if (data.success) {
      if (data.needMfa) {
        return {
          needMfa: true,
          mfaType: data.mfaType,
          phoneMask: data.phoneMask,
          tempToken: data.tempToken,
        } as MfaRequired
      }

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

      return { needMfa: false } as MfaRequired
    } else {
      const errorMsg = data.message || '登录失败'
      ElMessage.error(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async function mfaLoginVerify(tempToken: string, code: string) {
    const response = await fetch('/api/admin/mfa/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code }),
    })

    const result = await response.json()
    const data = result.data || result

    if (data.success) {
      token.value = data.token
      userInfo.value = data.user
      permissions.value = data.permissions || []

      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_user', JSON.stringify(data.user))

      ElMessage.success('登录成功')

      const redirect = router.currentRoute.value.query.redirect as string
      router.push(redirect || '/dashboard')
    } else {
      const errorMsg = data.message || '验证失败'
      ElMessage.error(errorMsg)
      throw new Error(errorMsg)
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
    pendingAuditCount,
    isLoggedIn,
    initApp,
    login,
    mfaLoginVerify,
    logout,
    toggleSidebar,
    hasPermission,
    updateUserInfo,
  }
})

export interface MfaRequired {
  needMfa: boolean
  mfaType?: string
  phoneMask?: string
  tempToken?: string
}
