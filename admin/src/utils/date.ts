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
