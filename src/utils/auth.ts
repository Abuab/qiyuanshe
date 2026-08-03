import { useUserStore } from '@/store/user'
import { secureStorage } from './crypto'

export const getToken = (): string => {
  return secureStorage.getToken()
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


