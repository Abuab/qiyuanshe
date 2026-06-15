import { computed } from 'vue'
import { useSystemStore } from '@/store/system'
import { icons as defaultIcons } from '@/config/icons'

/**
 * 获取动态配置的图标 URL，未配置时回退到本地静态图标
 */
export function useIcon() {
  const systemStore = useSystemStore()

  const iconConfig = computed(() => systemStore.icons)

  /** Tabbar 图标 */
  const getTabbarIcon = (name: 'home' | 'dynamic' | 'vip' | 'message' | 'my', active = false) => {
    const dynamic = iconConfig.value?.tabbar?.[name]
    const dynamicUrl = active ? dynamic?.active : dynamic?.default
    if (dynamicUrl) return dynamicUrl

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
