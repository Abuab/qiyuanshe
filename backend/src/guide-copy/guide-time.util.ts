/**
 * 东八区（Asia/Shanghai）自然日工具，保证统计与去重不受服务器时区影响。
 */

/** 返回指定时刻（默认现在）的东八区日期字符串 YYYY-MM-DD */
export function beijingDateStr(date: Date = new Date()): string {
  // 东八区 = UTC+8
  const shifted = new Date(date.getTime() + 8 * 3600 * 1000)
  return shifted.toISOString().slice(0, 10)
}

/** 返回最近 n 天（含今日）的东八区日期字符串数组，从旧到新 */
export function recentBeijingDates(n: number): string[] {
  const result: string[] = []
  const now = Date.now()
  for (let i = n - 1; i >= 0; i--) {
    result.push(beijingDateStr(new Date(now - i * 24 * 3600 * 1000)))
  }
  return result
}
