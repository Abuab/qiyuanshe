/**
 * AI Provider 加密工具
 *
 * API_KEY 必须 AES-256-CBC 加密存储
 * 密钥从环境变量 AI_ENCRYPT_KEY 读取，未配置则使用默认值（仅开发环境）
 */
import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getEncryptKey(): Buffer {
  const key = process.env.AI_ENCRYPT_KEY || 'qiyuanshe-ai-encrypt-key-32bytes!'
  return crypto.scryptSync(key, 'qiyuanshe-salt', 32)
}

/** 加密 API Key */
export function encryptApiKey(plainText: string): string {
  const key = getEncryptKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

/** 解密 API Key */
export function decryptApiKey(encryptedText: string): string {
  const key = getEncryptKey()
  const parts = encryptedText.split(':')
  if (parts.length !== 2) throw new Error('Invalid encrypted text format')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/** 脱敏显示：只显示前4位和后4位，中间用 *** 替代 */
export function maskApiKey(encryptedText: string): string {
  try {
    const plain = decryptApiKey(encryptedText)
    if (plain.length <= 8) return '****'
    return plain.slice(0, 4) + '****' + plain.slice(-4)
  } catch {
    return '****'
  }
}
