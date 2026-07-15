import { icons } from '@/config/icons'
import { useSystemStore } from '@/store/system'
import { getImageUrl } from '@/utils/common'

/**
 * Image error fallback composable.
 *
 * 加载失败时：
 *   - 先通过 /api/cos/image 接口重新获取签名 URL（后端可能重新生成签名）
 *   - 最多重试 2 次
 *   - 全部失败后回退到默认头像
 *
 * Usage: <image :src="url" @error="handleImageError" />
 */
export function useImageFallback() {
  /** 记录每个图片的原始 key 和重试次数 */
  const retryMap = new Map<string, { key: string; count: number }>()

  /**
   * 提取原始图片路径（即 COS key），用于重新调用 getImageUrl。
   */
  const extractKey = (src: string): string | null => {
    try {
      const url = new URL(src)
      const key = url.searchParams.get('key')
      if (key) return key
      // 兼容老的 /uploads/xxx 格式
      const pathname = url.pathname
      if (pathname.startsWith('/uploads/')) return pathname.slice(1)
    } catch {
      // 相对路径
      if (src.startsWith('/uploads/')) return src.slice(1)
      if (src.startsWith('uploads/')) return src
    }
    return null
  }

  /**
   * 图片加载错误处理。
   * 用法：<image :src="url" @error="handleImageError" />
   */
  const handleImageError = (e: any) => {
    const detail = e?.detail || e
    const target = detail?.target
    if (!target) return

    const currentSrc = target.src || ''
    const key = extractKey(currentSrc)

    if (!key) {
      // 无法提取 key，直接回退到默认头像
      const store = useSystemStore()
      target.src = store.defaultAvatar || icons.common.defaultAvatar
      return
    }

    // 检查重试次数
    let record = retryMap.get(key)
    if (!record) {
      record = { key, count: 0 }
      retryMap.set(key, record)
    }

    if (record.count >= 2) {
      // 已达最大重试次数，回退到默认头像
      const store = useSystemStore()
      target.src = store.defaultAvatar || icons.common.defaultAvatar
      retryMap.delete(key)
      return
    }

    // 重新获取签名 URL，仅在 URL 确实变化时计数重试
    const newUrl = getImageUrl(key)
    if (newUrl && newUrl !== currentSrc) {
      record.count++
      target.src = newUrl
    } else {
      // URL 未变化（如 token 未过期），直接回退默认头像
      const store = useSystemStore()
      target.src = store.defaultAvatar || icons.common.defaultAvatar
    }
  }

  return { handleImageError, defaultAvatar: icons.common.defaultAvatar }
}
