'use strict'

const express = require('express')
const db = require('../db')
const requireAdmin = require('../middleware/auth')

const router = express.Router()

router.use(requireAdmin)

/** 列出所有授权记录 */
router.get('/licenses', (req, res) => {
  return res.json({ success: true, data: db.list() })
})

/** 新增授权记录（预录入：客户激活前先在许可证服务器登记签名） */
router.post('/licenses', (req, res) => {
  const { customerId, customerName, licenseSignature, expiresAt, machineFingerprint, domain } = req.body || {}

  if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
    return res.status(400).json({ success: false, message: 'customerId 必填' })
  }
  if (!licenseSignature || typeof licenseSignature !== 'string' || !licenseSignature.trim()) {
    return res.status(400).json({ success: false, message: 'licenseSignature 必填' })
  }

  try {
    const row = db.create({
      customerId: customerId.trim(),
      customerName: customerName || null,
      licenseSignature: licenseSignature.trim(),
      expiresAt: expiresAt || null,
      machineFingerprint: machineFingerprint || null,
      domain: domain || null,
    })
    return res.json({ success: true, data: row, message: '创建成功' })
  } catch (e) {
    const msg = String(e && e.message)
    if (msg.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'customerId 或 licenseSignature 已存在' })
    }
    console.error('[license-server] 创建授权失败:', e)
    return res.status(500).json({ success: false, message: '创建失败' })
  }
})

/** 修改授权（延期 / 改状态 / 补录绑定信息） */
router.put('/licenses/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: false, message: '无效的 id' })
  }

  const row = db.getById(id)
  if (!row) {
    return res.status(404).json({ success: false, message: '授权记录不存在' })
  }

  const { customerName, expiresAt, machineFingerprint, domain, status } = req.body || {}
  const fields = {}

  if (customerName !== undefined) fields.customer_name = customerName
  if (expiresAt !== undefined) fields.expires_at = expiresAt
  if (machineFingerprint !== undefined) fields.machine_fingerprint = machineFingerprint
  if (domain !== undefined) fields.domain = domain

  if (status !== undefined) {
    if (!['active', 'revoked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status 只能是 active 或 revoked' })
    }
    fields.status = status
    fields.revoked_at = status === 'revoked' ? new Date().toISOString() : null
  } else if (expiresAt !== undefined) {
    // 仅延期（未显式指定 status）：若原状态为 expired/revoked，将过期时间延后即视为重新激活
    if (row.status !== 'active') {
      fields.status = 'active'
      fields.revoked_at = null
    }
  }

  const updated = db.update(id, fields)
  return res.json({ success: true, data: updated, message: '更新成功' })
})

/** 吊销授权 */
router.post('/licenses/:id/revoke', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ success: false, message: '无效的 id' })
  }

  const row = db.getById(id)
  if (!row) {
    return res.status(404).json({ success: false, message: '授权记录不存在' })
  }

  const updated = db.update(id, { status: 'revoked', revoked_at: new Date().toISOString() })
  return res.json({ success: true, data: updated, message: '已吊销' })
})

/** 统计看板 */
router.get('/stats', (req, res) => {
  const list = db.list()
  const now = Date.now()
  const thirtyDaysMs = 30 * 86400000

  const stats = {
    total: list.length,
    active: list.filter((r) => r.status === 'active' && (!r.expires_at || new Date(r.expires_at).getTime() > now)).length,
    revoked: list.filter((r) => r.status === 'revoked').length,
    expired: list.filter((r) => r.status === 'expired' || (r.expires_at && new Date(r.expires_at).getTime() <= now)).length,
    expiringSoon: list.filter((r) => {
      if (r.status !== 'active' || !r.expires_at) return false
      const exp = new Date(r.expires_at).getTime()
      return exp > now && exp - now <= thirtyDaysMs
    }).length,
  }

  return res.json({ success: true, data: stats })
})

module.exports = router
