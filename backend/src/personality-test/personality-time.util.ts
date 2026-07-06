/**
 * 人格测试 - 时间工具（统一按东八区 Asia/Shanghai 计算自然天/小时）
 *
 * 后端可能部署在不同系统时区，为保证「按自然天重置」「每小时限流」的口径一致，
 * 这里统一以 UTC+8 计算日期分片，不依赖服务器本地时区。
 */

const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000

function shanghaiDate(ts: number = Date.now()): Date {
  return new Date(ts + SHANGHAI_OFFSET_MS)
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** 东八区自然天 key，如 20260706 */
export function shanghaiDayKey(ts: number = Date.now()): string {
  const d = shanghaiDate(ts)
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`
}

/** 东八区小时 key，如 2026070613 */
export function shanghaiHourKey(ts: number = Date.now()): string {
  const d = shanghaiDate(ts)
  return `${shanghaiDayKey(ts)}${pad2(d.getUTCHours())}`
}

/** 距离下一个东八区零点的剩余秒数（用于自然天计数键的 TTL） */
export function secondsUntilShanghaiMidnight(ts: number = Date.now()): number {
  const d = shanghaiDate(ts)
  const secondsIntoDay =
    d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()
  const remain = 86400 - secondsIntoDay
  return remain > 0 ? remain : 1
}
