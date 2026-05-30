import { useUserStore } from '@/store/user'
import { post } from '@/utils/request'

export const getToken = (): string => {
  return uni.getStorageSync('token') || ''
}

export const checkLogin = (): boolean => {
  const token = getToken()
  if (!token) return false

  const userStore = useUserStore()
  return userStore.isLoggedIn
}

type LoginCallback = () => void

export const requireLogin = (callback?: LoginCallback): boolean => {
  if (checkLogin()) {
    if (callback) callback()
    return true
  }

  uni.navigateTo({
    url: '/pages/login/index'
  })

  return false
}

export const requireVip = (callback?: LoginCallback): boolean => {
  if (!checkLogin()) {
    uni.navigateTo({
      url: '/pages/login/index'
    })
    return false
  }

  const userStore = useUserStore()
  if (userStore.isVipValid) {
    if (callback) callback()
    return true
  }

  uni.showModal({
    title: '提示',
    content: '开通VIP会员后才能享受此功能，是否前往开通？',
    confirmText: '去开通',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({
          url: '/pages/vip/index'
        })
      }
    }
  })

  return false
}

export const getUserInfo = () => {
  const userStore = useUserStore()
  return userStore.userInfo
}

export const isVip = (): boolean => {
  const userStore = useUserStore()
  return userStore.isVipValid
}

export const refreshToken = async (): Promise<boolean> => {
  const refreshTokenValue = uni.getStorageSync('refreshToken')
  if (!refreshTokenValue) {
    return false
  }

  try {
    const result = await post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken: refreshTokenValue,
    })

    if (result && result.accessToken) {
      const userStore = useUserStore()
      if (userStore.userInfo) {
        userStore.login(result.accessToken, userStore.userInfo)
      }

      if (result.refreshToken) {
        uni.setStorageSync('refreshToken', result.refreshToken)
      }

      return true
    }
  } catch (error) {
    console.error('刷新token失败:', error)
    uni.removeStorageSync('refreshToken')
  }

  return false
}

export const logout = () => {
  const userStore = useUserStore()
  userStore.logout()
}
