'use strict'

/**
 * 简单的内存滑动窗口限流（每 IP 每分钟最多 60 次）。
 * 仅用于 /api/verify，避免被刷；无外部依赖。
 */
const WINDOW_MS = 60 * 1000
const MAX_HITS = 60
const hits = new Map()

// 定期清理过期记录，避免长期运行内存增长
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of hits.entries()) {
    if (now - record.start > WINDOW_MS) hits.delete(ip)
  }
}, WINDOW_MS).unref()

module.exports = function rateLimit(req, res, next) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown'
  const now = Date.now()
  const record = hits.get(ip)

  if (!record || now - record.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 })
    return next()
  }

  record.count += 1
  if (record.count > MAX_HITS) {
    return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' })
  }
  return next()
}
