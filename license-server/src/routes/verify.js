'use strict'

const express = require('express')
const db = require('../db')
const rateLimit = require('../middleware/rate-limit')

const router = express.Router()

/** 远程吊销后给客户服务器的宽限期（天） */
const GRACE_DAYS = 7

/**
 * POST /api/verify
 * 客户服务器每天心跳调用，根据 licenseSignature 判定远程状态。
 */
router.post('/verify', rateLimit, (req, res) => {
  const { licenseSignature, machineFingerprint, domain } = req.body || {}

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

  if (row.machine_fingerprint && machineFingerprint && row.machine_fingerprint !== machineFingerprint) {
    return res.json({ success: true, valid: false, status: 'invalid_machine', graceDaysLeft: 0, message: '机器指纹不匹配' })
  }

  return res.json({ success: true, valid: true, status: 'valid', graceDaysLeft: 0, message: '授权有效' })
})

module.exports = router
