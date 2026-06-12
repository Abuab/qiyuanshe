/**
 * 将数据库中存储的旧 IP 绝对 URL 转换为相对路径，避免管理后台/小程序加载失败。
 * 例如：http://150.158.130.152:3000/uploads/xxx.png → /uploads/xxx.png
 *
 * 新上传的图片后端已存为相对路径，此函数对相对路径和域名 URL 透传不做处理。
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return ''

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
