'use strict'

/**
 * 客户端接口鉴权：请求头 X-License-Secret 必须与 CLIENT_SECRET 环境变量一致。
 * 用于客户后端（服务器到服务器）调用 /api/activate、/api/heartbeat 等接口，
 * 避免公网暴露后接口被任意调用探测。未配置 CLIENT_SECRET 时一律拒绝（fail-closed）。
 */
module.exports = function requireClient(req, res, next) {
  const secret = process.env.CLIENT_SECRET || ''
  const provided = req.get('X-License-Secret') || ''
  if (secret && provided && provided === secret) {
    return next()
  }
  return res.status(401).json({ success: false, message: '未授权：Client Secret 无效' })
}
