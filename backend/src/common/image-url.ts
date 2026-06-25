/**
 * 将数据库中存储的旧 IP 绝对 URL 转换为相对路径，避免管理后台/小程序加载失败。
 * 例如：http://150.158.130.152:3000/uploads/xxx.png → /uploads/xxx.png
 *
 * 新上传的图片后端已存为相对路径，此函数对相对路径和域名 URL 透传不做处理。
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  // 过滤不可用的外部图片源（picsum 已不可用，placeholder/lorempixel 同理）
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(url)) {
    return ''
  }

  // 相对路径、data URI 直接放行
  if (url.startsWith('/') || url.startsWith('data:')) return url

  // HTTPS 域名 URL 放行
  if (url.startsWith('https://')) return url

  // HTTP IP 地址 URL → 提取路径部分转为相对路径
  const ipMatch = url.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.+)/)
  if (ipMatch) {
    return ipMatch[2] // 路径部分，如 /uploads/xxx.png
  }

  // 其他 HTTP URL（非 IP）直接放行
  return url
}

/** 不可用的外部头像域名 */
const EXTERNAL_AVATAR_DOMAINS = ['api.dicebear.com']

/**
 * 将数据库 avatar 字段解析为完整可访问 URL。
 * - 空值返回空字符串
 * - 已是以 http/https 开头的完整 URL 直接返回
 * - 相对路径使用 STATIC_BASE_URL 或 API_BASE_URL 拼接
 */
export function resolveAvatarUrl(url: string | undefined | null): string {
  if (!url) return ''

  // 过滤国内不可访问的外部头像域名
  try {
    const hostname = new URL(url).hostname
    if (EXTERNAL_AVATAR_DOMAINS.includes(hostname)) return ''
  } catch {
    // 不是完整 URL，继续按相对路径处理
  }

  // 完整 URL 直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  // data URI 直接返回
  if (url.startsWith('data:')) return url

  // 相对路径：使用 STATIC_BASE_URL 或 API_BASE_URL 拼接
  const baseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
  if (!baseUrl) {
    return url.startsWith('/') ? url : `/${url}`
  }
  return `${baseUrl}/${url.replace(/^\//, '')}`
}
