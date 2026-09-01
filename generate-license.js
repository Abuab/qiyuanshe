#!/usr/bin/env node
/**
 * 栖缘社 License 签发脚本（本地工具，仅供授权方使用）
 *
 * 用法：node generate-license.js [私钥路径]
 * 默认私钥路径：./license_private.pem
 *
 * 说明：
 * - 使用 RSA 私钥对 payload 做 SHA256 签名，输出 Base64 License Key 发给客户
 * - 公钥已硬编码在后端 backend/src/license/license.service.ts 中
 * - 私钥绝不可提交到代码仓库
 */
const crypto = require('crypto')
const fs = require('fs')
const readline = require('readline')

const PRIVATE_KEY_PATH = process.argv[2] || './license_private.pem'

// 与后端 ALL_LICENSE_FEATURES 保持一致
const ALL_FEATURES = [
  'user_browse',
  'like',
  'contact_apply',
  'matchmaker',
  'ai_match',
  'ai_quiz',
  'ai_chat',
  'chat',
  'dynamic_post',
  'answer',
  'vip',
  'visitor_log',
  'personality_test',
  'realname_auth',
]

function question(rl, q) {
  return new Promise((resolve) => rl.question(q, resolve))
}

async function main() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(`未找到私钥文件：${PRIVATE_KEY_PATH}`)
    console.error('用法：node generate-license.js <私钥路径>')
    process.exit(1)
  }

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const customerId = (await question(rl, '客户ID (如 C20260901001): ')).trim()
  if (!customerId) {
    console.error('客户ID不能为空')
    process.exit(1)
  }

  const customer = (await question(rl, '客户名称: ')).trim()
  if (!customer) {
    console.error('客户名称不能为空')
    process.exit(1)
  }

  const domain = (await question(rl, '绑定域名 (* 表示不限): ')).trim() || '*'

  const expiresAt = (await question(rl, '过期时间 (YYYY-MM-DD): ')).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    console.error('过期时间格式应为 YYYY-MM-DD')
    process.exit(1)
  }

  const status = (await question(rl, '授权状态 (valid/grace_period/expired, 默认 valid): ')).trim() || 'valid'
  if (!['valid', 'grace_period', 'expired'].includes(status)) {
    console.error('授权状态只能是 valid / grace_period / expired')
    process.exit(1)
  }

  const maxActivationsInput = (await question(rl, '最大激活次数 (默认 1，即最多激活 1 台服务器): ')).trim()
  const maxActivations = maxActivationsInput ? Number(maxActivationsInput) : 1
  if (!Number.isInteger(maxActivations) || maxActivations < 1) {
    console.error('最大激活次数应为大于 0 的整数')
    process.exit(1)
  }

  const payload = {
    customer,
    customerId,
    domain,
    status,
    expiresAt: expiresAt + 'T23:59:59+08:00',
    features: ALL_FEATURES,
    issuedAt: new Date().toISOString(),
    maxActivations,
  }

  const payloadStr = JSON.stringify(payload)
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(payloadStr)
  sign.end()
  const signature = sign.sign(privateKey, 'base64')

  const licenseKey = Buffer.from(JSON.stringify({ payload, signature })).toString('base64')

  console.log('\n========== License Key（发给客户） ==========')
  console.log(licenseKey)
  console.log('\n========== 授权信息 ==========')
  console.log(JSON.stringify(payload, null, 2))
  console.log('\n========== 预录入许可证服务器（可选，用于远程吊销） ==========')
  console.log('客户ID:', customerId)
  console.log('授权签名:', signature)

  rl.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
