import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/crypto'

interface UserInfo {
  id: number
  userId?: string  // 6位数字公开ID
  nickname: string
  avatar: string
  avatarReviewStatus?: number
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
  voiceUrl?: string
  voiceAuditStatus?: number
  voiceDuration?: number
  isVip?: boolean
  vipLevel?: number
  vipExpireTime?: string
  vipPackageName?: string
  isRealName?: boolean
  createTime?: string
  updatedAt?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const isVip = ref<boolean>(false)
  const vipExpireTime = ref<string>('')
  const isProfileComplete = ref<boolean>(true)

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  const isVipValid = computed(() => {
    if (!isVip.value || !vipExpireTime.value) return false
    const expireDate = new Date(vipExpireTime.value)
    return expireDate > new Date()
  })

  const login = (newToken: string, newUserInfo: UserInfo, profileComplete?: boolean) => {
    token.value = newToken
    userInfo.value = newUserInfo
    isVip.value = newUserInfo.isVip || false
    vipExpireTime.value = newUserInfo.vipExpireTime || ''
    isProfileComplete.value = profileComplete ?? true

    secureStorage.setToken(newToken)
    secureStorage.setUserInfo(newUserInfo)
    uni.setStorageSync('_qys_pc', isProfileComplete.value ? '1' : '0')
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    isVip.value = false
    vipExpireTime.value = ''
    isProfileComplete.value = true

    secureStorage.clearAll()
    try { uni.removeStorageSync('_qys_pc') } catch (_) { /* ignore */ }

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

  /** 编辑资料后更新 store（配置驱动，消除重复条件判断） */
  const updateProfile = (data: Record<string, unknown>) => {
    if (!userInfo.value) return

    // 字段类型映射：哪些字段是 string / number / string[]
    const stringFields = [
      'userId', 'nickname', 'avatar', 'updatedAt', 'education', 'occupation', 'incomeRange',
      'maritalStatus', 'residence', 'city', 'hometown', 'housingStatus', 'carStatus',
      'onlyChild', 'whenMarry', 'zodiac', 'constellation', 'partnerAgeRange',
      'partnerHeightMin', 'partnerEducation', 'partnerIncome', 'housingRequirement',
      'partnerMaritalStatus', 'acceptChildren', 'voiceUrl',
    ] as const

    const numberFields = [
      'gender', 'birthYear', 'height', 'weight', 'avatarReviewStatus',
      'voiceAuditStatus', 'voiceDuration',
    ] as const

    const arrayFields = ['personalityTags', 'hopeTaTags'] as const

    const updates: Partial<UserInfo> = {}
    let key: string

    // 统一处理 string 字段
    for (key of stringFields) {
      if (typeof data[key] === 'string') (updates as any)[key] = data[key]
    }

    // 统一处理 number 字段
    for (key of numberFields) {
      if (typeof data[key] === 'number') (updates as any)[key] = data[key]
    }

    // 后端返回 null 时也清除 avatarReviewStatus（新用户或从未提交审核的头像 → 设为 1）
    if ('avatarReviewStatus' in data && data.avatarReviewStatus === null) {
      updates.avatarReviewStatus = 1
    }

    // 统一处理数组字段
    for (key of arrayFields) {
      if (Array.isArray(data[key])) (updates as any)[key] = data[key]
    }

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
      try {
        isProfileComplete.value = uni.getStorageSync('_qys_pc') !== '0'
      } catch (_) {
        isProfileComplete.value = true
      }
    }
  }

  initFromStorage()

  return {
    token,
    userInfo,
    isVip,
    vipExpireTime,
    isProfileComplete,
    isLoggedIn,
    isVipValid,
    login,
    logout,
    updateUserInfo,
    updateProfile,
    checkVip
  }
})
