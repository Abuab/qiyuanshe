'use strict'

const crypto = require('crypto')

/**
 * 与后端 backend/src/license/license.service.ts 中 LICENSE_PUBLIC_KEY 保持一致的 RSA 公钥。
 * 仅用于验签，无法反向伪造签名；私钥由授权方离线保管。
 */
const PUBLIC_KEY = [
  '-----BEGIN PUBLIC KEY-----',
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3IfbfUBZM2sOLGHkweim',
  'gZcfG1/81fCmGGFpwEAdSi10KNqU/37PjBiFQl/Pz8zqJpRibyhueJ6GaceVlB+c',
  'SoDvW8CkydJ0J4/iPN2KR98q4xiBbF27wCMX8BPYSDQOn6Dld13b+fd+LbamGJOL',
  'Sr3zOIwdCHa7If/lAiNOq6EJPaoOpo9Rc9wCrx0kO3YmVI7xwod4Jm8ib/0KuFiy',
  'z5+Uswt57Hr3A6tJFx1YhWL/B2jtYIjZQg21uZXZ5MwaykRmP76HthK+YGnhoS6T',
  'kLNBt6Kvb24axGWSErTtoAnGlabb/N3NjqyxvqJKGkjoLLf3HMzc+R1wHM8SNBxp',
  '1QIDAQAB',
  '-----END PUBLIC KEY-----',
].join('\n')

/**
 * Base64 解码 + RSA-SHA256 验签，返回 { payload, signature }。
 * 验签失败抛出异常，由调用方统一捕获。
 */
function verifyAndParse(licenseKey) {
  let raw
  try {
    raw = JSON.parse(Buffer.from(licenseKey, 'base64').toString('utf8'))
  } catch {
    throw new Error('License Key 格式无效（无法 Base64 解码）')
  }

  const payload = raw && raw.payload
  const signature = raw && raw.signature
  if (!payload || typeof payload !== 'object' || typeof signature !== 'string') {
    throw new Error('License Key 结构无效（缺少 payload 或 signature）')
  }

  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(JSON.stringify(payload))
  verifier.end()
  if (!verifier.verify(PUBLIC_KEY, signature, 'base64')) {
    throw new Error('License Key 签名无效')
  }

  return { payload, signature }
}

module.exports = { PUBLIC_KEY, verifyAndParse }
