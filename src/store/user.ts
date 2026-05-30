import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface UserInfo {
  id: number
  nickname: string
  avatar: string
  phone?: string
  gender?: number
  birthYear?: number
  height?: number
  education?: string
  occupation?: string
  city?: string
  hometown?: string
  bio?: string
  photos?: string[]
  isVip?: boolean
  vipExpireTime?: string
  createTime?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const isVip = ref<boolean>(false)
  const vipExpireTime = ref<string>('')

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  const isVipValid = computed(() => {
    if (!isVip.value || !vipExpireTime.value) return false
    const expireDate = new Date(vipExpireTime.value)
    return expireDate > new Date()
  })

  const login = (newToken: string, newUserInfo: UserInfo) => {
    token.value = newToken
    userInfo.value = newUserInfo
    isVip.value = newUserInfo.isVip || false
    vipExpireTime.value = newUserInfo.vipExpireTime || ''

    uni.setStorageSync('token', newToken)
    uni.setStorageSync('userInfo', JSON.stringify(newUserInfo))
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    isVip.value = false
    vipExpireTime.value = ''

    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')

    uni.reLaunch({
      url: '/pages/index/index'
    })
  }

  const updateUserInfo = (newUserInfo: UserInfo) => {
    userInfo.value = { ...userInfo.value, ...newUserInfo }
    isVip.value = newUserInfo.isVip || isVip.value
    vipExpireTime.value = newUserInfo.vipExpireTime || vipExpireTime.value

    uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
  }

  const checkVip = () => {
    if (!vipExpireTime.value) return false

    const expireDate = new Date(vipExpireTime.value)
    const now = new Date()

    if (expireDate <= now) {
      isVip.value = false
      if (userInfo.value) {
        userInfo.value.isVip = false
        uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
      }
      return false
    }

    return true
  }

  const initFromStorage = () => {
    const storedToken = uni.getStorageSync('token')
    const storedUserInfo = uni.getStorageSync('userInfo')

    if (storedToken && storedUserInfo) {
      token.value = storedToken
      try {
        userInfo.value = JSON.parse(storedUserInfo)
        isVip.value = userInfo.value?.isVip || false
        vipExpireTime.value = userInfo.value?.vipExpireTime || ''
      } catch (e) {
        console.error('Failed to parse userInfo:', e)
      }
    }
  }

  initFromStorage()

  return {
    token,
    userInfo,
    isVip,
    vipExpireTime,
    isLoggedIn,
    isVipValid,
    login,
    logout,
    updateUserInfo,
    checkVip
  }
})
