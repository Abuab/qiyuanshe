import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get } from '@/utils/request'
import { logger } from '@/utils/logger'

export type LicenseStatus = 'valid' | 'grace_period' | 'expired' | 'unauthorized'

export interface LicenseInfo {
  status: LicenseStatus
  expiresAt: string
  features: string[]
  graceDaysLeft: number
  lockMessage: string
}

export const useLicenseStore = defineStore('license', () => {
  const status = ref<LicenseStatus>('valid')
  const expiresAt = ref('')
  const features = ref<string[]>([])
  const graceDaysLeft = ref(0)
  const lockMessage = ref('')
  const loaded = ref(false)
  /** 宽限期横幅是否被手动关闭（持久化到本地 storage，授权状态变化时自动清除） */
  const graceBannerClosed = ref(false)

  const isGracePeriod = computed(() => status.value === 'grace_period')
  const isExpired = computed(() => status.value === 'expired')
  const isUnauthorized = computed(() => status.value === 'unauthorized')
  const isLocked = computed(() => isExpired.value || isUnauthorized.value)
  const showGraceBanner = computed(() => isGracePeriod.value && !graceBannerClosed.value)

  /**
   * 判断功能是否可用：
   * - 未加载完成或授权有效（valid / grace_period）时全部可用
   * - 过期 / 未授权时以 features 白名单为准（单一事实源）
   */
  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!loaded.value) return true
    if (!isLocked.value) return true
    return features.value.includes(featureKey)
  }

  const closeGraceBanner = () => {
    graceBannerClosed.value = true
    uni.setStorageSync('license:graceBannerClosed', '1')
  }

  const applyInfo = (info: LicenseInfo | null) => {
    if (!info) {
      // fail-open：接口异常时按 valid 处理，避免后端故障误锁全部写操作
      status.value = 'valid'
      features.value = []
      loaded.value = false
      return
    }
    status.value = info.status ?? 'valid'
    expiresAt.value = info.expiresAt || ''
    features.value = Array.isArray(info.features) ? info.features : []
    graceDaysLeft.value = info.graceDaysLeft ?? 0
    lockMessage.value = info.lockMessage || ''
    loaded.value = true

    // 状态不再是宽限期时，清除持久化的关闭标记，使下次回到宽限期时横幅重新显示
    if (status.value !== 'grace_period') {
      try {
        uni.removeStorageSync('license:graceBannerClosed')
      } catch {
        /* ignore */
      }
    }
  }

  const loadLicense = async () => {
    try {
      const info = await get<LicenseInfo>('/system/license')
      applyInfo(info)
      // 宽限期时恢复用户之前的关闭状态（持久化标记）
      if (status.value === 'grace_period') {
        graceBannerClosed.value = uni.getStorageSync('license:graceBannerClosed') === '1'
      }
    } catch (e) {
      logger.error('[License] 加载授权状态失败:', e)
      applyInfo(null)
    }
  }

  return {
    status,
    expiresAt,
    features,
    graceDaysLeft,
    lockMessage,
    loaded,
    isGracePeriod,
    isExpired,
    isUnauthorized,
    isLocked,
    showGraceBanner,
    isFeatureEnabled,
    closeGraceBanner,
    loadLicense,
  }
})
