import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import router from '../router'
import { adminAudit } from '../api/audit'
import { adminAuth } from '../api/auth'

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
  const isCollapsed = ref(false)
  // 审核管理（资料/照片等）待审核数
  const pendingAuditCount = ref(0)
  // 各子模块待审核数
  const pendingSinglePromiseCount = ref(0)
  const pendingEducationCount = ref(0)
  const pendingPropertyCount = ref(0)
  const pendingCarCount = ref(0)
  const pendingCirclePostCount = ref(0)

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

  function finishLogin(data: any, rememberMe?: boolean) {
    token.value = data.token || ''
    userInfo.value = data.user || null

    localStorage.setItem('admin_token', data.token || '')
    localStorage.setItem('admin_user', JSON.stringify(data.user))

    // 存储 refreshToken
    if (data.refreshToken) {
      localStorage.setItem('admin_refresh_token', data.refreshToken)
    }

    if (rememberMe) {
      localStorage.setItem('admin_remember', 'true')
    }

    ElMessage.success('登录成功')

    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/dashboard')
  }

  async function login(username: string, password: string, captcha: string, rememberMe: boolean, captchaKey?: string) {
    const res = await adminAuth.login({ username, password, captcha, captchaKey })
    const data = res.data

    if (data && data.success) {
      if (data.needMfa) {
        return {
          needMfa: true,
          mfaType: data.mfaType || '',
          phoneMask: data.phoneMask || '',
          tempToken: data.tempToken || '',
        } as MfaRequired
      }

      finishLogin(data, rememberMe)
      return { needMfa: false } as MfaRequired
    } else {
      const errorMsg = data?.message || '登录失败'
      ElMessage.error(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async function mfaLoginVerify(tempToken: string, code: string) {
    const res = await adminAuth.mfaLoginVerify({ tempToken, code })
    const data = res.data

    if (data && data.success) {
      finishLogin(data)
    } else {
      const errorMsg = data?.message || '验证失败'
      ElMessage.error(errorMsg)
      throw new Error(errorMsg)
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_refresh_token')
    localStorage.removeItem('admin_remember')
    router.push({ name: 'Login' })
    ElMessage.success('已退出登录')
  }

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
  }

  function updateUserInfo(info: Partial<AdminUser>) {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...info }
      localStorage.setItem('admin_user', JSON.stringify(userInfo.value))
    }
  }

  async function fetchPendingAuditCount() {
    try {
      const res = await adminAudit.pendingCount()
      const data = res.data
      if (data) {
        // 父级徽标 = 全部待审核
        pendingAuditCount.value = data.total ?? 0
        // 各子模块徽标
        pendingSinglePromiseCount.value = data.singlePromise ?? 0
        pendingEducationCount.value = data.education ?? 0
        pendingPropertyCount.value = data.property ?? 0
        pendingCarCount.value = data.car ?? 0
        pendingCirclePostCount.value = data.circlePost ?? 0
      }
    } catch { /* ignore */ }
  }

  return {
    token,
    userInfo,
    isCollapsed,
    pendingAuditCount,
    pendingSinglePromiseCount,
    pendingEducationCount,
    pendingPropertyCount,
    pendingCarCount,
    pendingCirclePostCount,
    isLoggedIn,
    initApp,
    login,
    mfaLoginVerify,
    logout,
    toggleSidebar,
    updateUserInfo,
    fetchPendingAuditCount,
  }
})

export interface MfaRequired {
  needMfa: boolean
  mfaType?: string
  phoneMask?: string
  tempToken?: string
}
