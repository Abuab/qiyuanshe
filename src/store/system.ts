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

interface TabbarIcon {
  default: string
  active: string
}

interface IconConfig {
  tabbar: {
    home: TabbarIcon
    dynamic: TabbarIcon
    vip: TabbarIcon
    message: TabbarIcon
    my: TabbarIcon
  }
  menu: Record<string, string>
  page: Record<string, string>
}

interface SystemConfig {
  splashText: string
  appName: string
  shareTitle: string
  shareDesc: string
  matchmakers: Matchmaker[]
  icons: IconConfig
}

const DEFAULT_ICONS: IconConfig = {
  tabbar: {
    home: { default: '', active: '' },
    dynamic: { default: '', active: '' },
    vip: { default: '', active: '' },
    message: { default: '', active: '' },
    my: { default: '', active: '' },
  },
  menu: {},
  page: {},
}

export const useSystemStore = defineStore('system', () => {
  const splashText = ref<string>('正在寻找你的缘分...')
  const appName = ref<string>('')
  const shareTitle = ref<string>('')
  const shareDesc = ref<string>('专业的婚恋匹配平台，为你找到最合适的另一半')
  const matchmakers = ref<Matchmaker[]>([])
  const icons = ref<IconConfig>(DEFAULT_ICONS)
  const dicts = ref<Record<string, any>>({})
  let initialLoadDone = false

  const loadSystemConfig = async () => {
    try {
      const res = await get<SystemConfig>('/system/config')
      console.log('[SYSTEM] config res:', JSON.stringify(res))
      if (res) {
        splashText.value = res.splashText || splashText.value
        appName.value = res.appName !== undefined ? res.appName : appName.value
        shareTitle.value = res.shareTitle !== undefined ? res.shareTitle : shareTitle.value
        shareDesc.value = res.shareDesc || shareDesc.value
        matchmakers.value = res.matchmakers || []
        icons.value = res.icons || DEFAULT_ICONS
        console.log('[SYSTEM] icons set:', JSON.stringify(icons.value))
        saveToStorage()
        initialLoadDone = true
      }
    } catch (e) {
      console.error('[SystemStore] Failed to load system config:', e)
    }
  }

  /** 加载选项字典（职业、我的特点、希望TA） */
  const loadDicts = async () => {
    try {
      const res = await get<Record<string, any>>('/system/dicts')
      if (res) {
        dicts.value = res
      }
    } catch (e) {
      console.error('[SystemStore] Failed to load dicts:', e)
    }
  }

  const initFromStorage = () => {
    const storedConfig = uni.getStorageSync('systemConfig')
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig)
        if (!initialLoadDone) {
          splashText.value = config.splashText || splashText.value
          appName.value = config.appName || appName.value
          shareTitle.value = config.shareTitle || shareTitle.value
          shareDesc.value = config.shareDesc || shareDesc.value
          matchmakers.value = config.matchmakers || matchmakers.value
          icons.value = config.icons || icons.value
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
      icons: icons.value,
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
    icons,
    dicts,
    loadSystemConfig,
    loadDicts,
    saveToStorage,
  }
})
