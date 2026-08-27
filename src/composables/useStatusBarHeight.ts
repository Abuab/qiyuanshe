import { ref } from 'vue'

/**
 * 统一获取状态栏高度（px），供自定义导航栏（navigationStyle: "custom"）页面复用。
 *
 * - iOS 刘海屏约 44、灵动岛机型（iPhone 14 Pro 等）约 59、Android 按机型各异，
 *   系统 API 已返回包含灵动岛在内的正确高度，无需各页面自行适配。
 * - 获取失败或返回 0 时回退到 fallback，避免页面顶部内容被遮挡。
 */
export function useStatusBarHeight(fallback = 20) {
  const statusBarHeight = ref(fallback)

  try {
    const sysInfo = uni.getWindowInfo()
    if (sysInfo.statusBarHeight) {
      statusBarHeight.value = sysInfo.statusBarHeight
    }
  } catch {
    // 极端环境取不到系统信息时保留默认值
  }

  return statusBarHeight
}
