'use strict'

const express = require('express')
const db = require('../db')
const rateLimit = require('../middleware/rate-limit')
const requireClient = require('../middleware/client-auth')
const { verifyAndParse } = require('../license-key')

const router = express.Router()

// 客户端接口统一鉴权（X-License-Secret），管理接口走独立的 X-Admin-Key，互不影响
router.use(requireClient)

/** 远程吊销后给客户服务器的宽限期（天） */
const GRACE_DAYS = 7

/** 依据 license 记录计算远程状态（吊销 / 过期 / 有效） */
function computeStatus(row) {
  if (row.status === 'revoked') {
    return { status: 'revoked', graceDaysLeft: GRACE_DAYS }
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    db.markExpired(row.id)
    return { status: 'expired', graceDaysLeft: 0 }
  }
  return { status: 'valid', graceDaysLeft: 0 }
}

/**
 * POST /api/verify（保留，兼容旧客户端）
 * 客户服务器每天心跳调用，根据 licenseSignature 判定远程状态。
 */
router.post('/verify', rateLimit, (req, res) => {
  const { licenseSignature, domain } = req.body || {}

  if (!licenseSignature || typeof licenseSignature !== 'string') {
    return res.status(400).json({ success: false, message: '缺少 licenseSignature' })
  }

  const row = db.getBySignature(licenseSignature)
  if (!row) {
    return res.json({ success: true, valid: false, status: 'not_found', graceDaysLeft: 0, message: '未找到该授权码' })
  }

  db.recordHeartbeat(row.id, { domain })

  if (row.status === 'revoked') {
    return res.json({ success: true, valid: false, status: 'revoked', graceDaysLeft: GRACE_DAYS, message: '授权已被吊销' })
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    db.markExpired(row.id)
    return res.json({ success: true, valid: false, status: 'expired', graceDaysLeft: 0, message: '授权已过期' })
  }

  return res.json({ success: true, valid: true, status: 'valid', graceDaysLeft: 0, message: '授权有效' })
})

/**
 * POST /api/activate
 * 客户服务器激活时调用：本地 RSA 验签 + 激活次数配额检查 + 创建/复用 activation 记录。
 */
router.post('/activate', rateLimit, (req, res) => {
  const { licenseKey, activationId, domain } = req.body || {}
  const ip = req.body?.ip || req.ip

  if (!licenseKey || typeof licenseKey !== 'string') {
    return res.status(400).json({ success: false, message: '缺少 licenseKey' })
  }

  let payload
  let signature
  try {
    ;({ payload, signature } = verifyAndParse(licenseKey))
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message })
  }

  const maxActivations =
    Number.isInteger(payload.maxActivations) && payload.maxActivations > 0 ? payload.maxActivations : 1

  try {
    const customerId = String(payload.customerId || payload.customer || signature)
    let license = db.getBySignature(signature)

    if (license) {
      // 同一签名重复激活：同步配额（签名一致即 payload 一致，此处为幂等兜底）
      db.update(license.id, { max_activations: maxActivations })
      license = db.getById(license.id)
    } else {
      // 新签名：优先按 customerId 复用已有记录（续费换发新 key），否则新建
      const existing = db.getByCustomerId(customerId)
      if (existing) {
        db.update(existing.id, {
          license_signature: signature,
          customer_name: payload.customer || null,
          expires_at: payload.expiresAt || null,
          max_activations: maxActivations,
          status: 'active',
          revoked_at: null,
        })
        license = db.getById(existing.id)
      } else {
        license = db.create({
          customerId,
          customerName: payload.customer || null,
          licenseSignature: signature,
          expiresAt: payload.expiresAt || null,
          domain: domain || null,
          maxActivations,
        })
      }
    }

    if (!license) {
      return res.status(500).json({ success: false, message: '许可证记录创建失败' })
    }

    // 重复激活同一实例：带上已分配的 activationId，仅更新心跳，不新增占用
    if (activationId != null) {
      const existing = db.getActivationById(Number(activationId))
      if (existing && existing.license_id === license.id) {
        db.touchActivation(existing.id, { domain, ip })
        return res.json({
          success: true,
          activationId: existing.id,
          activeCount: db.countActivations(license.id),
          maxActivations: license.max_activations,
          message: '该实例已激活，已更新心跳',
        })
      }
    }

    const activeCount = db.countActivations(license.id)
    if (activeCount >= license.max_activations) {
      return res.json({ success: false, message: '激活次数已达上限，请先解绑旧实例' })
    }

    const activation = db.createActivation({ licenseId: license.id, domain, ip })
    return res.json({
      success: true,
      activationId: activation.id,
      activeCount: activeCount + 1,
      maxActivations: license.max_activations,
      message: '激活成功',
    })
  } catch (e) {
    console.error('[license-server] 激活处理失败:', e)
    return res.status(500).json({ success: false, message: '激活失败' })
  }
})

/**
 * POST /api/deactivate
 * 客户服务器解绑时调用：删除匹配的 activation 记录，释放激活名额。
 */
router.post('/deactivate', rateLimit, (req, res) => {
  const { licenseSignature, activationId } = req.body || {}

  if (!licenseSignature || typeof licenseSignature !== 'string') {
    return res.status(400).json({ success: false, message: '缺少 licenseSignature' })
  }
  if (activationId == null) {
    return res.status(400).json({ success: false, message: '缺少 activationId' })
  }

  const row = db.getBySignature(licenseSignature)
  if (!row) {
    return res.status(404).json({ success: false, message: '授权记录不存在' })
  }

  const deleted = db.deleteActivation(row.id, Number(activationId))
  if (!deleted) {
    return res.json({ success: false, message: '未找到匹配的激活实例' })
  }
  return res.json({ success: true, message: '解绑成功' })
})

/**
 * POST /api/heartbeat
 * 客户服务器每天心跳调用：更新 activation 的 last_heartbeat_at 并返回远程状态。
 */
router.post('/heartbeat', rateLimit, (req, res) => {
  const { licenseSignature, activationId, domain } = req.body || {}
  const ip = req.body?.ip || req.ip

  if (!licenseSignature || typeof licenseSignature !== 'string') {
    return res.status(400).json({ success: false, message: '缺少 licenseSignature' })
  }

  const row = db.getBySignature(licenseSignature)
  if (!row) {
    return res.json({ success: true, status: 'not_found', graceDaysLeft: 0, message: '未找到该授权码' })
  }

  db.recordHeartbeat(row.id, { domain })

  if (activationId != null) {
    const activation = db.getActivationById(Number(activationId))
    if (activation && activation.license_id === row.id) {
      db.touchActivation(activation.id, { domain, ip })
    }
  }

  const { status, graceDaysLeft } = computeStatus(row)
  return res.json({ success: true, status, graceDaysLeft, message: '心跳已记录' })
})

/**
 * GET /api/activations?licenseSignature=xxx
 * 客户服务器查询当前 license 的激活实例数与上限（供管理后台展示）。
 */
router.get('/activations', rateLimit, (req, res) => {
  const licenseSignature = String(req.query.licenseSignature || '').trim()
  if (!licenseSignature) {
    return res.status(400).json({ success: false, message: '缺少 licenseSignature' })
  }

  const row = db.getBySignature(licenseSignature)
  if (!row) {
    return res.json({ success: true, data: { maxActivations: 0, activationCount: 0, activations: [] } })
  }

  const activations = db.listActivations(row.id)
  return res.json({
    success: true,
    data: { maxActivations: row.max_activations, activationCount: activations.length, activations },
  })
})

module.exports = router
