import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get } from '@/utils/request'

interface Matchmaker {
  id: number
  name: string
  avatar: string
  title: string
  desc: string
}

interface SystemConfig {
  splashText: string
  appName: string
  shareTitle: string
  shareDesc: string
  matchmakers: Matchmaker[]
  vipAgreement?: string
}

export const useSystemStore = defineStore('system', () => {
  const splashText = ref<string>('正在寻找你的缘分...')
  const appName = ref<string>('')
  const shareTitle = ref<string>('')
  const shareDesc = ref<string>('专业的婚恋匹配平台，为你找到最合适的另一半')
  const matchmakers = ref<Matchmaker[]>([])
  const vipAgreement = ref<string>('')
  let initialLoadDone = false

  const loadSystemConfig = async () => {
    try {
      const res = await get<SystemConfig>('/system/config')
      if (res) {
        splashText.value = res.splashText || splashText.value
        appName.value = res.appName !== undefined ? res.appName : appName.value
        shareTitle.value = res.shareTitle !== undefined ? res.shareTitle : shareTitle.value
        shareDesc.value = res.shareDesc || shareDesc.value
        matchmakers.value = res.matchmakers || []
        vipAgreement.value = res.vipAgreement || vipAgreement.value
        saveToStorage()
        initialLoadDone = true
      }
    } catch (e) {
      console.error('[SystemStore] Failed to load system config:', e)
    }
  }

  const initFromStorage = () => {
    const storedConfig = uni.getStorageSync('systemConfig')
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig)
        // 只有尚未从 API 加载时才使用缓存
        if (!initialLoadDone) {
          splashText.value = config.splashText || splashText.value
          appName.value = config.appName || appName.value
          shareTitle.value = config.shareTitle || shareTitle.value
          shareDesc.value = config.shareDesc || shareDesc.value
          matchmakers.value = config.matchmakers || matchmakers.value
          vipAgreement.value = config.vipAgreement || vipAgreement.value
        }
      } catch (e) {
        console.error('[SystemStore] Failed to parse system config:', e)
      }
    }
  }

  const saveToStorage = () => {
    const config: SystemConfig = {
      splashText: splashText.value,
      appName: appName.value,
      shareTitle: shareTitle.value,
      shareDesc: shareDesc.value,
      matchmakers: matchmakers.value,
      vipAgreement: vipAgreement.value,
    }
    uni.setStorageSync('systemConfig', JSON.stringify(config))
  }

  initFromStorage()

  return {
    splashText,
    appName,
    shareTitle,
    shareDesc,
    matchmakers,
    vipAgreement,
    loadSystemConfig,
    saveToStorage
  }
})
