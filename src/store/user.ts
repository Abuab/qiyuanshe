import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'

interface UserInfo {
  id: number
  nickname: string
  avatar: string
  phone?: string
  gender?: number
  birthYear?: number
  height?: number
  weight?: number
  education?: string
  occupation?: string
  incomeRange?: string
  maritalStatus?: string
  residence?: string
  city?: string
  hometown?: string
  housingStatus?: string
  carStatus?: string
  onlyChild?: string
  whenMarry?: string
  zodiac?: string
  constellation?: string
  partnerAgeRange?: string
  partnerHeightMin?: string
  partnerEducation?: string
  partnerIncome?: string
  housingRequirement?: string
  partnerMaritalStatus?: string
  acceptChildren?: string
  photos?: string[]
  personalityTags?: string[]
  hopeTaTags?: string[]
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

    secureStorage.setToken(newToken)
    secureStorage.setUserInfo(newUserInfo)
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    isVip.value = false
    vipExpireTime.value = ''

    secureStorage.clearAll()

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
    secureStorage.setUserInfo(userInfo.value)
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
    if (typeof data.weight === 'number') updates.weight = data.weight
    if (typeof data.education === 'string') updates.education = data.education
    if (typeof data.occupation === 'string') updates.occupation = data.occupation
    if (typeof data.incomeRange === 'string') updates.incomeRange = data.incomeRange
    if (typeof data.maritalStatus === 'string') updates.maritalStatus = data.maritalStatus
    if (typeof data.residence === 'string') updates.residence = data.residence
    if (typeof data.city === 'string') updates.city = data.city
    if (typeof data.hometown === 'string') updates.hometown = data.hometown
    if (typeof data.housingStatus === 'string') updates.housingStatus = data.housingStatus
    if (typeof data.carStatus === 'string') updates.carStatus = data.carStatus
    if (typeof data.onlyChild === 'string') updates.onlyChild = data.onlyChild
    if (typeof data.whenMarry === 'string') updates.whenMarry = data.whenMarry
    if (typeof data.zodiac === 'string') updates.zodiac = data.zodiac
    if (typeof data.constellation === 'string') updates.constellation = data.constellation
    if (typeof data.partnerAgeRange === 'string') updates.partnerAgeRange = data.partnerAgeRange
    if (typeof data.partnerHeightMin === 'string') updates.partnerHeightMin = data.partnerHeightMin
    if (typeof data.partnerEducation === 'string') updates.partnerEducation = data.partnerEducation
    if (typeof data.partnerIncome === 'string') updates.partnerIncome = data.partnerIncome
    if (typeof data.housingRequirement === 'string') updates.housingRequirement = data.housingRequirement
    if (typeof data.partnerMaritalStatus === 'string') updates.partnerMaritalStatus = data.partnerMaritalStatus
    if (typeof data.acceptChildren === 'string') updates.acceptChildren = data.acceptChildren
    if (Array.isArray(data.personalityTags)) updates.personalityTags = data.personalityTags as string[]
    if (Array.isArray(data.hopeTaTags)) updates.hopeTaTags = data.hopeTaTags as string[]
    Object.assign(userInfo.value, updates)
    secureStorage.setUserInfo(userInfo.value)
  }

  const checkVip = () => {
    if (!vipExpireTime.value) return false

    const expireDate = new Date(vipExpireTime.value)
    const now = new Date()

    if (expireDate <= now) {
      isVip.value = false
      if (userInfo.value) {
        userInfo.value.isVip = false
        secureStorage.setUserInfo(userInfo.value)
      }
      return false
    }

    return true
  }

  const initFromStorage = () => {
    const storedToken = secureStorage.getToken()
    const storedUserInfo = secureStorage.getUserInfo() as UserInfo | null

    if (storedToken && storedUserInfo) {
      token.value = storedToken
      userInfo.value = storedUserInfo
      isVip.value = storedUserInfo.isVip || false
      vipExpireTime.value = storedUserInfo.vipExpireTime || ''
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
