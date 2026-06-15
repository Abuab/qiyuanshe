import { storeToRefs } from 'pinia'
import { useSystemStore } from '@/store/system'
import { icons as defaultIcons } from '@/config/icons'

/**
 * 获取动态配置的图标 URL，未配置时回退到本地静态图标
 */
export function useIcon() {
  const systemStore = useSystemStore()
  const { icons: iconConfig } = storeToRefs(systemStore)

  /** Tabbar 图标（一种状态有 URL 则两种状态通用） */
  const getTabbarIcon = (name: 'home' | 'dynamic' | 'vip' | 'message' | 'my', active = false) => {
    const dynamic = iconConfig.value?.tabbar?.[name]
    const dynamicActive = dynamic?.active || ''
    const dynamicDefault = dynamic?.default || ''

    // 当前状态有 URL → 直接用
    const targetUrl = active ? dynamicActive : dynamicDefault
    if (targetUrl) return targetUrl

    // 当前状态为空，另一个状态有 → 共用
    if (dynamicActive) return dynamicActive
    if (dynamicDefault) return dynamicDefault

    // 都没上传 → 本地默认图标
    const fallback = defaultIcons.tabbar[name]
    return active ? fallback.active : fallback.default
  }

  /** 我的页面菜单图标 */
  const getMenuIcon = (name: string) => {
    return iconConfig.value?.menu?.[name] || ''
  }

  /** 页面内图标 */
  const getPageIcon = (name: string) => {
    return iconConfig.value?.page?.[name] || ''
  }

  return {
    iconConfig,
    getTabbarIcon,
    getMenuIcon,
    getPageIcon,
  }
}
