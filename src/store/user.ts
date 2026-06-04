import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'

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
  incomeRange?: string
  maritalStatus?: string
  residence?: string
  city?: string
  hometown?: string
  selfIntro?: string
  bio?: string
  photos?: string[]
  isVip?: boolean
  isRealName?: boolean
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

  const updateUserInfo = (newUserInfo: Partial<UserInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...newUserInfo }
      isVip.value = (newUserInfo.isVip as boolean | undefined) || isVip.value
      vipExpireTime.value = (newUserInfo.vipExpireTime as string | undefined) || vipExpireTime.value
    }
    uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
  }

  /** 编辑资料后更新 store */
  const updateProfile = (data: Record<string, unknown>) => {
    if (!userInfo.value) return
    const updates: Partial<UserInfo> = {}
    if (typeof data.nickname === 'string') updates.nickname = data.nickname
    if (typeof data.avatar === 'string') updates.avatar = data.avatar
    if (typeof data.gender === 'number') updates.gender = data.gender
    if (typeof data.birthYear === 'number') updates.birthYear = data.birthYear
    if (typeof data.height === 'number') updates.height = data.height
    if (typeof data.education === 'string') updates.education = data.education
    if (typeof data.occupation === 'string') updates.occupation = data.occupation
    if (typeof data.incomeRange === 'string') updates.incomeRange = data.incomeRange
    if (typeof data.maritalStatus === 'string') updates.maritalStatus = data.maritalStatus
    if (typeof data.residence === 'string') updates.residence = data.residence
    if (typeof data.city === 'string') updates.city = data.city
    if (typeof data.hometown === 'string') updates.hometown = data.hometown
    if (typeof data.selfIntro === 'string') updates.selfIntro = data.selfIntro
    if (typeof data.bio === 'string') updates.bio = data.bio
    Object.assign(userInfo.value, updates)
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
        logger.error('Failed to parse userInfo:', e)
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
    updateProfile,
    checkVip
  }
})
