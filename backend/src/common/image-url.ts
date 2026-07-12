/**
 * 将数据库中存储的旧 IP 绝对 URL 转换为相对路径，避免管理后台/小程序加载失败。
 * 例如：http://150.158.130.152:3000/uploads/xxx.png → /uploads/xxx.png
 *
 * 新上传的图片后端已存为相对路径，此函数对相对路径和域名 URL 透传不做处理。
 */

/**
 * 检测 COS 代理 URL 并提取原始文件 key（防止双层嵌套）
 * /api/cos/image?key=uploads/xxx.jpg → /uploads/xxx.jpg
 * 若非 COS 代理 URL 返回 null
 */
function extractCosProxyKey(pathOrUrl: string): string | null {
  const match = pathOrUrl.match(/\/api\/cos\/image\?key=([^&]+)/)
  if (!match) return null
  const rawKey = decodeURIComponent(match[1])
  return rawKey.startsWith('/') ? rawKey : '/' + rawKey
}

export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  // 过滤不可用的外部图片源（picsum 已不可用，placeholder/lorempixel 同理）
  if (/picsum\.photos|placeholder\.com|lorempixel/i.test(url)) {
    return ''
  }

  // 相对路径、data URI 直接放行
  if (url.startsWith('/') || url.startsWith('data:')) {
    // 如果相对路径是 COS 代理 URL（数据库存储了完整代理 URL），提取原始 key
    const key = extractCosProxyKey(url)
    if (key) return key
    return url
  }

  // 自身域名的 HTTPS URL → 提取路径转为相对路径，确保小程序通过 COS 网关加载
  const ownBaseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
  if (ownBaseUrl && url.startsWith(ownBaseUrl)) {
    const relative = url.slice(ownBaseUrl.length) || '/'
    // 如果剥离域名后是 COS 代理 URL，提取原始 key
    const key = extractCosProxyKey(relative)
    if (key) return key
    return relative
  }

  // 外部 HTTPS 域名 URL 放行
  if (url.startsWith('https://')) return url

  // HTTP IP 地址 URL → 提取路径部分转为相对路径
  const ipMatch = url.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.+)/)
  if (ipMatch) {
    const relative = ipMatch[2]
    // IP 地址的 COS 代理 URL 也要提取 key
    const key = extractCosProxyKey(relative)
    if (key) return key
    return relative
  }

  // 其他 HTTP URL（非 IP）直接放行
  return url
}

/**
 * 将数据库中存储的相对静态资源路径（如 /uploads/voice-xxx.mp3）解析为完整可访问 URL。
 * - 数据库统一存相对路径，迁移域名时只需改 STATIC_BASE_URL，无需刷历史数据
 * - 空值返回空字符串；已是 http/https 完整 URL 直接返回（兼容历史绝对路径数据）
 * - 相对路径用 STATIC_BASE_URL（站点根域名，不含 /api）拼接；未配置时回退 API_BASE_URL
 */
export function resolveStaticUrl(url: string | undefined | null): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('data:')) return url
  const baseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
  if (!baseUrl) return url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}/${url.replace(/^\//, '')}`
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
