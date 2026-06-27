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
  matchmakerHiText: string
  matchmakerShowHi: boolean
  matchmakerButtonText: string
  quickEntryNames: string[]
  followEmptyText: string
  followerEmptyText: string
  redLineTerm: string
  vipCardTexts: string[]
  icons: IconConfig
  matchmakerSafetyLabel: string
  matchmakerSafetyBoundaryLabel: string
  showOfficialAccountPrompt: boolean
  chatEnabled: boolean
  vipEnabled: boolean
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
  const matchmakerHiText = ref<string>('Hi')
  const matchmakerShowHi = ref<boolean>(true)
  const matchmakerButtonText = ref<string>('红娘')
  const quickEntryNames = ref<string[]>(['红娘评语', '最新活动', '相亲圈子', '我们脱单了'])
  const followEmptyText = ref<string>('您还木有关注任何人~')
  const followerEmptyText = ref<string>('还木有人关注您~')
  const redLineTerm = ref<string>('红线')
  const vipCardTexts = ref<string[]>(['限时特惠，尊享VIP特权', '每日签到领金币，解锁更多功能', '开通VIP，优先匹配心仪TA'])
  const matchmakerSafetyLabel = ref<string>('内容提示')
  const matchmakerSafetyBoundaryLabel = ref<string>('安全提醒')
  const showOfficialAccountPrompt = ref<boolean>(true)
  const chatEnabled = ref<boolean>(true)
  const vipEnabled = ref<boolean>(true)
  const matchmakers = ref<Matchmaker[]>([])
  const icons = ref<IconConfig>(DEFAULT_ICONS)
  const dicts = ref<Record<string, any>>({})
  /** AI功能开关配置 */
  const aiMasterEnabled = ref<boolean>(true)
  const aiFeatures = ref<Record<string, boolean>>({})
  let aiConfigLoadedAt = 0
  const AI_CONFIG_CACHE_MS = 5 * 60 * 1000 // 5分钟缓存过期
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
        matchmakerHiText.value = res.matchmakerHiText || matchmakerHiText.value
        matchmakerShowHi.value = res.matchmakerShowHi !== undefined ? res.matchmakerShowHi : matchmakerShowHi.value
        matchmakerButtonText.value = res.matchmakerButtonText || matchmakerButtonText.value
        quickEntryNames.value = res.quickEntryNames || quickEntryNames.value
        followEmptyText.value = res.followEmptyText || followEmptyText.value
        followerEmptyText.value = res.followerEmptyText || followerEmptyText.value
        redLineTerm.value = res.redLineTerm || redLineTerm.value
        vipCardTexts.value = res.vipCardTexts || vipCardTexts.value
        matchmakerSafetyLabel.value = res.matchmakerSafetyLabel || matchmakerSafetyLabel.value
        matchmakerSafetyBoundaryLabel.value = res.matchmakerSafetyBoundaryLabel || matchmakerSafetyBoundaryLabel.value
        showOfficialAccountPrompt.value = res.showOfficialAccountPrompt !== undefined ? res.showOfficialAccountPrompt : showOfficialAccountPrompt.value
        chatEnabled.value = res.chatEnabled !== undefined ? res.chatEnabled : chatEnabled.value
        vipEnabled.value = res.vipEnabled !== undefined ? res.vipEnabled : vipEnabled.value
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
          matchmakerHiText.value = config.matchmakerHiText || matchmakerHiText.value
          matchmakerShowHi.value = config.matchmakerShowHi !== undefined ? config.matchmakerShowHi : matchmakerShowHi.value
          matchmakerButtonText.value = config.matchmakerButtonText || matchmakerButtonText.value
          quickEntryNames.value = config.quickEntryNames || quickEntryNames.value
          followEmptyText.value = config.followEmptyText || followEmptyText.value
          followerEmptyText.value = config.followerEmptyText || followerEmptyText.value
          redLineTerm.value = config.redLineTerm || redLineTerm.value
          vipCardTexts.value = config.vipCardTexts || vipCardTexts.value
          matchmakerSafetyLabel.value = config.matchmakerSafetyLabel || matchmakerSafetyLabel.value
          matchmakerSafetyBoundaryLabel.value = config.matchmakerSafetyBoundaryLabel || matchmakerSafetyBoundaryLabel.value
          showOfficialAccountPrompt.value = config.showOfficialAccountPrompt !== undefined ? config.showOfficialAccountPrompt : showOfficialAccountPrompt.value
          chatEnabled.value = config.chatEnabled !== undefined ? config.chatEnabled : chatEnabled.value
          vipEnabled.value = config.vipEnabled !== undefined ? config.vipEnabled : vipEnabled.value
          icons.value = config.icons || icons.value
        }
      } catch (e) {
        console.error('[SystemStore] Failed to parse system config:', e)
      }
    }

    // 从本地缓存恢复 AI 开关（过期后会重新请求）
    const aiCached = uni.getStorageSync('aiFeatureConfig')
    if (aiCached) {
      try {
        const parsed = JSON.parse(aiCached)
        aiMasterEnabled.value = parsed.masterEnabled !== undefined ? parsed.masterEnabled : true
        aiFeatures.value = parsed.features || {}
        aiConfigLoadedAt = parsed._ts || 0
      } catch { /* ignore */ }
    }
  }

  /** 加载 AI 功能开关配置（带5分钟缓存，force=true 时跳过缓存） */
  const loadAiFeatureConfig = async (force = false) => {
    const now = Date.now()
    if (!force && now - aiConfigLoadedAt < AI_CONFIG_CACHE_MS && aiConfigLoadedAt > 0) {
      return // 缓存未过期，直接使用
    }
    try {
      const res = await get<any>('/ai/feature-config')
      if (res) {
        aiMasterEnabled.value = res.masterEnabled !== undefined ? res.masterEnabled : true
        aiFeatures.value = res.features || {}
        aiConfigLoadedAt = now
        // 缓存到本地 storage
        uni.setStorageSync('aiFeatureConfig', JSON.stringify({
          masterEnabled: aiMasterEnabled.value,
          features: aiFeatures.value,
          _ts: now,
        }))
      }
    } catch (e) {
      console.error('[SystemStore] Failed to load AI feature config:', e)
    }
  }

  /** 检查某个 AI 功能是否可用 */
  const isAiFeatureEnabled = (featureKey: string): boolean => {
    if (!aiMasterEnabled.value) return false
    return aiFeatures.value[featureKey] === true
  }

  const saveToStorage = () => {
    const config: SystemConfig = {
      splashText: splashText.value,
      appName: appName.value,
      shareTitle: shareTitle.value,
      shareDesc: shareDesc.value,
      matchmakers: matchmakers.value,
      matchmakerHiText: matchmakerHiText.value,
      matchmakerShowHi: matchmakerShowHi.value,
      matchmakerButtonText: matchmakerButtonText.value,
      quickEntryNames: quickEntryNames.value,
      followEmptyText: followEmptyText.value,
      followerEmptyText: followerEmptyText.value,
      redLineTerm: redLineTerm.value,
      vipCardTexts: vipCardTexts.value,
      matchmakerSafetyLabel: matchmakerSafetyLabel.value,
      matchmakerSafetyBoundaryLabel: matchmakerSafetyBoundaryLabel.value,
      showOfficialAccountPrompt: showOfficialAccountPrompt.value,
      icons: icons.value,
      chatEnabled: chatEnabled.value,
      vipEnabled: vipEnabled.value,
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
    matchmakerHiText,
    matchmakerShowHi,
    matchmakerButtonText,
    quickEntryNames,
    followEmptyText,
    followerEmptyText,
    redLineTerm,
    vipCardTexts,
    matchmakerSafetyLabel,
    matchmakerSafetyBoundaryLabel,
    showOfficialAccountPrompt,
    chatEnabled,
    vipEnabled,
    icons,
    dicts,
    loadSystemConfig,
    loadDicts,
    saveToStorage,
    loadAiFeatureConfig,
    isAiFeatureEnabled,
    aiMasterEnabled,
    aiFeatures,
  }
})
