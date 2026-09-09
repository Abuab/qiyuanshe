/**
 * 获取当前页面路由 query 参数（跨平台）。
 * MP-WEIXIN：从页面栈最后一页读取 options；H5（hash 路由）：从 location.hash 解析。
 *
 * 背景：uni-app H5 在直接打开详情页（如 #/pages/user-detail/index?id=9）时，
 * getCurrentPages()[last].options 与 onLoad 入参都可能拿不到 query，导致详情页
 * 取不到 id、数据请求从未发起，页面一直「加载中」。此处统一兜底。
 */
export function getRouteQuery(): Record<string, string> {
  // #ifdef MP-WEIXIN
  const pages = getCurrentPages()
  return ((pages[pages.length - 1] as any)?.options || {}) as Record<string, string>
  // #endif

  // #ifndef MP-WEIXIN
  try {
    const qs = (window.location.hash || '').split('?')[1] || ''
    const params: Record<string, string> = {}
    qs.split('&').forEach((pair) => {
      const idx = pair.indexOf('=')
      if (idx === -1) {
        if (pair) params[pair] = ''
      } else {
        params[pair.slice(0, idx)] = pair.slice(idx + 1)
      }
    })
    return params
  } catch {
    return {}
  }
  // #endif
}

/**
 * 安全调用 uni.showShareMenu。
 * H5 等平台未实现该 API（uni.showShareMenu 为 undefined），直接调用会抛
 * `TypeError: uni.showShareMenu is not a function`，从而中断调用方后续逻辑
 * （例如详情页 onMounted 中取 id 并请求数据的代码）。仅在 API 存在时调用。
 */
export function safeShowShareMenu(options?: Record<string, unknown>) {
  try {
    const fn = (uni as any).showShareMenu
    if (typeof fn === 'function') fn(options)
  } catch {
    // 忽略：分享菜单不可用
  }
}

/**
 * 安全返回 - 根据页面栈深度决定 navigateBack 或 switchTab
 */
const TAB_BAR_PAGES = [
  '/pages/index/index',
  '/subpkg-pages/questions/index',
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
