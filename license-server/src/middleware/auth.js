'use strict'

/**
 * 管理面板 API 鉴权：请求头 X-Admin-Key 必须与 ADMIN_KEY 环境变量一致。
 * 未配置 ADMIN_KEY 时一律拒绝（fail-closed，防止默认放行）。
 */
module.exports = function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY || ''
  const provided = req.get('X-Admin-Key') || ''
  if (adminKey && provided && provided === adminKey) {
    return next()
  }
  return res.status(401).json({ success: false, message: '未授权：Admin Key 无效' })
}
