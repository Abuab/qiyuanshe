import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as crypto from 'crypto'

/**
 * 应用层加密服务 — AES-256-GCM
 *
 * 用途：对 real_name_identities 表中 realName / idCard 等敏感字段做
 * 数据库存储前加密、读取时解密，实现"数据库泄露也无法还原明文"。
 *
 * 密钥管理：
 * - 密钥来自环境变量 IDENTITY_ENCRYPTION_KEY（64 位十六进制字符串 = 32 字节）
 * - 不提供密钥生成命令：由运维在安全环境下生成后注入环境变量
 * - 示例生成方式：openssl rand -hex 32
 *
 * 加密格式（二进制拼接）：
 *   IV(12) | AuthTag(16) | Ciphertext(N)
 * 返回 base64url 字符串。
 */
@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name)
  private readonly key: Buffer
  private readonly algorithm = 'aes-256-gcm'

  // GCM 推荐 nonce 长度 12 字节
  private readonly IV_LENGTH = 12
  // GCM auth tag 长度 16 字节
  private readonly AUTH_TAG_LENGTH = 16

  constructor() {
    const keyHex = process.env.IDENTITY_ENCRYPTION_KEY
    if (!keyHex || keyHex.length !== 64) {
      this.logger.warn(
        'IDENTITY_ENCRYPTION_KEY 未配置或长度不足64位，加密服务已初始化但不可用。' +
        '请运行 openssl rand -hex 32 生成密钥并注入环境变量。',
      )
      this.key = Buffer.alloc(0)
    } else {
      this.key = Buffer.from(keyHex, 'hex')
    }
  }

  /**
   * 模块初始化时校验密钥。
   * - 生产环境：密钥缺失 → 抛出 Error，中止启动
   * - 非生产环境：密钥缺失 → 仅警告，允许继续启动（开发/测试阶段可能未配置）
   */
  onModuleInit() {
    if (this.key.length !== 32) {
      const message =
        '========================================================\n' +
        '  IDENTITY_ENCRYPTION_KEY 未正确配置！\n' +
        '  实名身份信息（realName / idCard）将无法加密存储。\n' +
        '  请执行以下命令生成密钥并注入环境变量：\n' +
        '    openssl rand -hex 32\n' +
        '  然后将其写入 backend/.env：\n' +
        '    IDENTITY_ENCRYPTION_KEY=<生成的64位十六进制字符串>\n' +
        '========================================================'
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(message)
        throw new Error(message)
      }
      this.logger.warn(message)
    } else {
      this.logger.log('IDENTITY_ENCRYPTION_KEY 已配置，AES-256-GCM 加密服务就绪')
    }
  }

  /**
   * 检查密钥是否已就绪。
   * 未配置密钥时所有加密操作返回 null，保证不会静默失败。
   */
  private ensureKey(): Buffer {
    if (this.key.length !== 32) {
      throw new Error('加密服务未就绪：IDENTITY_ENCRYPTION_KEY 未正确配置')
    }
    return this.key
  }

  /**
   * 加密明文，返回 base64url 格式密文。
   * @param plaintext 待加密的明文字符串
   * @returns base64url 密文；若 plaintext 为空则返回空字符串
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return ''
    const key = this.ensureKey()

    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    })

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    // 拼接：IV + AuthTag + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted])
    return combined.toString('base64url')
  }

  /**
   * 解密密文，返回明文字符串。
   * @param ciphertext 由 encrypt() 生成的 base64url 密文
   * @returns 明文；若 ciphertext 为空则返回空字符串
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ''
    const key = this.ensureKey()

    const combined = Buffer.from(ciphertext, 'base64url')
    if (combined.length < this.IV_LENGTH + this.AUTH_TAG_LENGTH) {
      this.logger.warn('密文长度不足，可能数据损坏或被篡改')
      return ''
    }

    const iv = combined.subarray(0, this.IV_LENGTH)
    const authTag = combined.subarray(
      this.IV_LENGTH,
      this.IV_LENGTH + this.AUTH_TAG_LENGTH,
    )
    const encrypted = combined.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH)

    try {
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
        authTagLength: this.AUTH_TAG_LENGTH,
      })
      decipher.setAuthTag(authTag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    } catch (err: any) {
      this.logger.warn(`解密失败: ${err?.message || err}`)
      return ''
    }
  }

  /**
   * 尝试解密身份字段值（兼容加密/明文混合存储的过渡期）。
   * - 若值为密文格式 → 解密后返回明文
   * - 若值为明文 → 直接返回
   * - 若值为空 → 返回空字符串
   *
   * 供所有读取 realName/idCard 的消费方统一复用，避免各处重复实现。
   */
  tryDecryptIdentity(value: string): string {
    if (!value) return ''
    if (this.isEncrypted(value)) {
      return this.decrypt(value)
    }
    return value
  }

  /**
   * 判断当前值是否已是密文格式（启发式：base64url 长度 > 32 且不含明文特征字符）。
   * 用于存量数据迁移时的兼容性判断。
   */
  isEncrypted(value: string): boolean {
    if (!value) return false
    // 密文格式：IV(12) + AuthTag(16) + 至少 1 字节密文 = 至少 29 字节 → base64url 约 39 字符
    // 明文中文姓名通常 2-4 个中文字，UTF-8 编码最多 12 字节
    if (value.length < 30) return false
    // 中文姓名或身份证号包含的特征字符
    if (/^[\u4e00-\u9fff·\dXx*]+$/.test(value)) return false
    // base64url 特征：只含 A-Za-z0-9-_=
    return /^[A-Za-z0-9\-_=]+$/.test(value)
  }
}
