/**
 * 格式化日期字符串或 Date 对象为中文日期时间
 * 兼容 ISO 字符串、时间戳、Date 对象，解析失败返回 '-'
 */
export function formatDate(dateStr?: string | number | Date): string {
  if (dateStr === null || dateStr === undefined || dateStr === '') return '-'
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 返回当前本地时间的日期字符串 YYYY-MM-DD（避免 toISOString 的 UTC 时区问题）
 */
export function todayLocalStr(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
