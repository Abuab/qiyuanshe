#!/usr/bin/env node
/**
 * 实名身份信息解密小工具
 * ========================
 * 用途：query-realname.sh 等运维脚本从数据库查出密文后，通过本工具解密为明文。
 *
 * 用法：
 *   node scripts/decrypt-identity.js <base64url密文>
 *   echo "密文" | node scripts/decrypt-identity.js --stdin
 *
 * 兼容性：若输入为明文（中文姓名/身份证号格式），直接原样输出。
 *         密钥未配置时输出 <UNCONFIGURED> 并退出码 1。
 *
 * 环境变量：
 *   IDENTITY_ENCRYPTION_KEY — 64位十六进制 AES-256-GCM 密钥
 *   从项目根目录 .env 或系统环境变量读取
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// ---- 读取密钥 ----
function loadKey() {
  // 先尝试环境变量
  let keyHex = process.env.IDENTITY_ENCRYPTION_KEY
  if (!keyHex) {
    // 尝试从项目根目录 .env 读取
    const envPath = path.resolve(__dirname, '..', '.env')
    try {
      const content = fs.readFileSync(envPath, 'utf-8')
      const match = content.match(/^IDENTITY_ENCRYPTION_KEY=(.+)$/m)
      if (match) keyHex = match[1].trim()
    } catch {
      // env file not found — ignore
    }
  }
  if (!keyHex || keyHex.length !== 64) {
    return null
  }
  return Buffer.from(keyHex, 'hex')
}

// ---- 判断是否为密文 ----
function isEncrypted(value) {
  if (!value || value.length < 30) return false
  // 中文姓名/身份证特征
  if (/^[\u4e00-\u9fff·\dXx*]+$/.test(value)) return false
  // base64url 特征
  return /^[A-Za-z0-9\-_=]+$/.test(value)
}

// ---- 解密 ----
function decrypt(ciphertext, key) {
  if (!ciphertext) return ''
  if (!isEncrypted(ciphertext)) return ciphertext

  const combined = Buffer.from(ciphertext, 'base64url')
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return `<CORRUPTED:len=${combined.length}>`
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8')
  } catch (err) {
    return `<DECRYPT_FAILED:${err.message}>`
  }
}

// ---- 主入口 ----
function main() {
  const key = loadKey()
  if (!key) {
    process.stderr.write('[decrypt-identity] IDENTITY_ENCRYPTION_KEY 未配置，无法解密\n')
    process.exit(1)
  }

  let input = ''
  if (process.argv.includes('--stdin')) {
    // 从 stdin 读取（支持管道）
    input = fs.readFileSync(0, 'utf-8').trim()
  } else if (process.argv[2]) {
    input = process.argv[2]
  } else {
    process.stderr.write('用法: node decrypt-identity.js <密文>  或  echo "密文" | node decrypt-identity.js --stdin\n')
    process.exit(1)
  }

  process.stdout.write(decrypt(input, key))
}

main()
