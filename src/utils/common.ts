import dayjs from 'dayjs'
import { icons } from '@/config/icons'
import { getServerBaseUrl } from './request'
import { getToken } from './auth'

export const formatDate = (date: string | Date | number, format: string = 'YYYY-MM-DD'): string => {
  if (!date) return ''
  return dayjs(date).format(format)
}

export const formatDateTime = (date: string | Date | number): string => {
  return formatDate(date, 'YYYY-MM-DD HH:mm')
}

export const showToast = (title: string, icon: 'success' | 'none' | 'loading' = 'none', duration: number = 1500): void => {
  uni.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 将相对图片路径转换为通过后端 COS 网关访问的 URL。
 * 所有图片统一走 /api/cos/image?key= 接口，由后端负责 COS 签名 URL 或降级到本地。
 *
 * uni-app <image> 组件无法发送自定义 HTTP 头（Authorization），
 * 因此将 JWT token 作为 ?token= 查询参数一并携带。
 * 注：accessToken 有效期约为 30 分钟，过期后图片 URL 将无法访问，
 * 需配合 useImageFallback 在 onError 时重新获取签名 URL。
 *
 * @param key - 图片相对路径，如 "uploads/avatar/123.jpg" 或 "/uploads/avatar/123.jpg"
 * @returns 后端 COS 网关 URL（含 token）
 */
export const getImageUrl = (key: string | null | undefined): string => {
  if (!key) return ''
  // 过滤 picsum.photos / placeholder 等不可用外部图片源
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(key)) {
    return icons.common.defaultAvatar
  }
  // 静态资源和 data URI 直接返回
  if (key.startsWith('/static/') || key.startsWith('data:')) return key

  const serverBase = getServerBaseUrl()
  // 如果已经是完整的 HTTP(S) URL，且不是本地服务器地址，直接返回
  if (key.startsWith('http://') || key.startsWith('https://')) {
    // 替换旧 IP 地址为当前域名后走 COS 网关
    const ipMatch = key.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/)
    if (ipMatch) {
      return key.replace(ipMatch[0], serverBase)
    }
    // 自身域名的 HTTPS URL，提取路径走 COS 网关
    if (key.startsWith(serverBase)) {
      const relative = key.slice(serverBase.length)
      let cleanKey = relative.replace(/^\//, '')
      // 若本身已是 COS 代理 URL（双层嵌套），提取原始 key，保证幂等
      const nested = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
      if (nested) cleanKey = decodeURIComponent(nested[1]).replace(/^\//, '')
      const token = getToken()
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
    }
    return key
  }
  // 相对路径：去掉开头的 / 后传给 COS 网关
  let cleanKey = key.replace(/^\//, '')
  // 如果相对路径本身是 COS 代理 URL（双层嵌套），提取原始 key
  const cosNestedMatch = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
  if (cosNestedMatch) {
    cleanKey = decodeURIComponent(cosNestedMatch[1]).replace(/^\//, '')
  }
  const token = getToken()
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
}

/** 将相对图片路径转换为完整 URL */
export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  // 过滤 picsum.photos / placeholder 等不可用外部图片源
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(path)) {
    return icons.common.defaultAvatar
  }

  // 优先使用独立的静态资源域名（CDN/OSS），否则回退到 API 域名
  const viteEnv = (import.meta as unknown as Record<string, Record<string, string>>).env
  const serverBase = (viteEnv?.VITE_STATIC_BASE_URL || getServerBaseUrl()).replace(/\/$/, '')

  if (path.startsWith('http://') || path.startsWith('https://')) {
    // 替换旧 IP 地址为当前域名后走 COS 网关
    const ipMatch = path.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/)
    if (ipMatch) {
      return path.replace(ipMatch[0], serverBase)
    }
    // 自身域名的 HTTPS URL，提取路径走 COS 网关
    if (path.startsWith(serverBase)) {
      const relative = path.slice(serverBase.length)
      let cleanKey = relative.replace(/^\//, '')
      // 若本身已是 COS 代理 URL（双层嵌套），提取原始 key，保证幂等
      const nested = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
      if (nested) cleanKey = decodeURIComponent(nested[1]).replace(/^\//, '')
      const token = getToken()
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
    }
    return path
  }
  if (path.startsWith('/static/')) return path
  if (path.startsWith('data:')) return path

  // 相对路径走 COS 网关
  let cleanKey = path.replace(/^\//, '')
  // 如果相对路径本身是 COS 代理 URL（双层嵌套），提取原始 key
  const cosNestedMatch = cleanKey.match(/^api\/cos\/image\?key=([^&]+)/)
  if (cosNestedMatch) {
    cleanKey = decodeURIComponent(cosNestedMatch[1]).replace(/^\//, '')
  }
  const token = getToken()
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${serverBase}/api/cos/image?key=${encodeURIComponent(cleanKey)}${tokenParam}`
}


