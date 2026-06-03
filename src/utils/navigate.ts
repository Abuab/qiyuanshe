/**
 * 安全返回 - 根据页面栈深度决定 navigateBack 或 switchTab
 */
const TAB_BAR_PAGES = [
  '/pages/index/index',
  '/pages/questions/index',
  '/pages/vip/index',
  '/pages/message-list/index',
  '/pages/my/index',
]

export function safeNavigateBack(fallbackUrl = '/pages/index/index') {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    if (TAB_BAR_PAGES.includes(fallbackUrl)) {
      uni.switchTab({ url: fallbackUrl })
    } else {
      uni.redirectTo({ url: fallbackUrl })
    }
  }
}
