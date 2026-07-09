/**
 * 北京时间（UTC+8）工具函数
 * toISOString() 始终返回 UTC，这里提供东八区的替代方案。
 */

/**
 * 返回指定时刻（默认现在）的北京时间 ISO 字符串，如 "2026-07-09T14:30:00.000+08:00"
 * 适用于 API 响应中的时间字段，确保前端展示为北京时间。
 */
export function beijingISO(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date)
  const shifted = new Date(d.getTime() + 8 * 3600 * 1000)
  return shifted.toISOString().replace('Z', '+08:00')
}

/**
 * 返回指定时刻（默认现在）的北京时间日期字符串 YYYY-MM-DD
 */
export function beijingDateStr(date: Date | string | number = new Date()): string {
  return beijingISO(date).slice(0, 10)
}

/**
 * 返回指定时刻（默认现在）的北京时间日期时间字符串 YYYY-MM-DD HH:mm:ss
 */
export function beijingDateTime(
  date: Date | string | number = new Date(),
): string {
  const d = date instanceof Date ? date : new Date(date)
  const shifted = new Date(d.getTime() + 8 * 3600 * 1000)
  return shifted.toISOString().replace('T', ' ').slice(0, 19)
}
