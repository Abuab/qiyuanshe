import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createVerify, createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import * as os from 'os'
import { SystemLicense } from '../entities/SystemLicense'

export type LicenseStatus = 'valid' | 'grace_period' | 'expired' | 'unauthorized'

export interface LicenseInfo {
  status: LicenseStatus
  expiresAt: string
  features: string[]
  graceDaysLeft: number
  lockMessage: string
  customer?: string
  customerId?: string
  domain?: string
  activatedAt?: string
}

/** 授权码中签发的载荷（不含签名） */
export interface LicensePayload {
  customer: string
  customerId?: string
  domain?: string
  status?: 'valid' | 'grace_period' | 'expired'
  expiresAt: string
  features?: string[]
  issuedAt?: string
  /** 绑定的机器指纹（可选，签发时写入；用于防止同一 License Key 复制到其他服务器） */
  machineId?: string
  /** V1 旧版 License Key 使用的机器指纹字段（向后兼容，等价于 machineId） */
  machineFingerprint?: string
}

/** 所有功能 featureKey（与小程序端 src/config/license-features.ts 保持一致） */
export const ALL_LICENSE_FEATURES = [
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
] as const

/** 只读功能：授权过期/未授权时仍保留 */
const READ_ONLY_FEATURES: string[] = ['user_browse', 'realname_auth']

/** 公钥注入 token：生产使用下方硬编码公钥，测试可注入临时公钥以验证验签链路 */
export const LICENSE_PUBLIC_KEY_TOKEN = 'LICENSE_PUBLIC_KEY'

/** 硬编码 RSA 公钥（与签发方私钥配对，仅用于验签，无法反向伪造签名） */
export const LICENSE_PUBLIC_KEY = [
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

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name)

  constructor(
    @InjectRepository(SystemLicense)
    private readonly licenseRepository: Repository<SystemLicense>,
    @Inject(LICENSE_PUBLIC_KEY_TOKEN)
    private readonly publicKey: string,
  ) {}

  /** 读取当前授权状态。未激活/验签失败/指纹不匹配/数据库异常一律按 unauthorized（fail-closed，防破解优先）。 */
  async getLicenseInfo(): Promise<LicenseInfo> {
    let license: SystemLicense | null = null
    try {
      license = await this.licenseRepository.findOne({
        where: { isActivated: true },
        order: { id: 'DESC' },
      })
    } catch (error: any) {
      this.logger.error(`[License] 读取授权记录失败，按未授权处理: ${error?.message}`)
    }

    if (!license) {
      return this.unauthorizedInfo()
    }

    try {
      const payload = this.verifyAndParse(this.decryptOrFallback(license.licenseKey))
      this.verifyMachineBinding(payload)
      return this.buildLocalInfo(payload, license)
    } catch (error: any) {
      this.logger.error(`[License] 授权码校验失败，按未授权处理: ${error?.message}`)
      return this.unauthorizedInfo()
    }
  }

  /** 读取已激活的 License 记录（供启动时校验打印日志） */
  async getActivatedLicense(): Promise<SystemLicense | null> {
    try {
      return await this.licenseRepository.findOne({
        where: { isActivated: true },
        order: { id: 'DESC' },
      })
    } catch {
      return null
    }
  }

  /** 获取本机机器指纹与当前 License 绑定的指纹（供管理后台展示，方便客户绑定防复制） */
  async getMachineBindingInfo(): Promise<{ machineFingerprint: string; boundMachineId: string | null }> {
    const machineFingerprint = this.getMachineFingerprint()
    let boundMachineId: string | null = null
    try {
      const license = await this.licenseRepository.findOne({
        where: { isActivated: true },
        order: { id: 'DESC' },
      })
      if (license) {
        const payload = this.verifyAndParse(this.decryptOrFallback(license.licenseKey))
        boundMachineId = payload.machineId || payload.machineFingerprint || null
      }
    } catch {
      // 未激活或验签失败时，绑定指纹视为空
      boundMachineId = null
    }
    return { machineFingerprint, boundMachineId }
  }

  /** 激活/更新 License：本地验签 → 机器指纹绑定校验 → 写入本地数据库 */
  async activateLicense(licenseKey: string): Promise<LicenseInfo> {
    const payload = this.verifyAndParse(licenseKey)
    this.verifyMachineBinding(payload)

    // 构建时注入的客户标识校验（A 客户源码编译的镜像，B 客户的 License Key 无法激活）
    const buildCustomerId = process.env.BUILD_CUSTOMER_ID
    if (buildCustomerId && buildCustomerId !== payload.customerId) {
      throw new Error('License Key 与客户标识不匹配')
    }

    const data = {
      isActivated: true,
      licenseKey: this.encryptLicenseKey(licenseKey),
      activatedAt: new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      features: this.sanitizeFeatures(payload.features),
      customerId: payload.customerId || null,
      customerName: payload.customer || null,
    }

    let record = await this.licenseRepository.findOne({
      where: { isActivated: true },
      order: { id: 'DESC' },
    })
    if (record) {
      await this.licenseRepository.update(record.id, data)
    } else {
      record = this.licenseRepository.create(data)
      await this.licenseRepository.save(record)
    }

    return this.getLicenseInfo()
  }

  /** 判断当前是否授权可用（valid / grace_period 均视为可用） */
  async isActive(): Promise<boolean> {
    const info = await this.getLicenseInfo()
    return info.status === 'valid' || info.status === 'grace_period'
  }

  /** Base64 解码 + 提取 payload/signature + RSA-SHA256 验签，返回 payload */
  private verifyAndParse(licenseKey: string): LicensePayload {
    let raw: any
    try {
      raw = JSON.parse(Buffer.from(licenseKey, 'base64').toString('utf8'))
    } catch {
      throw new Error('License Key 格式无效（无法 Base64 解码）')
    }

    const payload = raw?.payload
    const signature = raw?.signature
    if (!payload || typeof payload !== 'object' || typeof signature !== 'string') {
      throw new Error('License Key 结构无效（缺少 payload 或 signature）')
    }

    const verifier = createVerify('RSA-SHA256')
    verifier.update(JSON.stringify(payload))
    verifier.end()
    if (!verifier.verify(this.publicKey, signature, 'base64')) {
      throw new Error('License Key 签名无效')
    }

    if (typeof payload.customer !== 'string' || !payload.customer) {
      throw new Error('License Key 缺少客户名称')
    }

    return payload as LicensePayload
  }

  /** 基于本地验签 + 本地过期时间推导状态 */
  private buildLocalInfo(payload: LicensePayload, license: SystemLicense): LicenseInfo {
    const expiresAt = typeof payload.expiresAt === 'string' ? payload.expiresAt : ''

    let status: LicenseStatus
    if (payload.status === 'grace_period') {
      status = 'grace_period'
    } else if (payload.status === 'expired') {
      status = 'expired'
    } else {
      status = this.isExpired(expiresAt) ? 'expired' : 'valid'
    }

    const features =
      status === 'expired' ? [...READ_ONLY_FEATURES] : this.sanitizeFeatures(payload.features)

    const graceDaysLeft = this.calcGraceDays(expiresAt)
    const lockMessage = status === 'expired' ? '系统授权已过期' : '系统未授权'

    return {
      status,
      expiresAt,
      features,
      graceDaysLeft,
      lockMessage,
      customer: payload.customer,
      customerId: payload.customerId || '',
      domain: payload.domain || '',
      activatedAt: license.activatedAt ? license.activatedAt.toISOString() : '',
    }
  }

  /** 采集本机机器指纹（多源组合 + SHA256，用于 License Key 绑定，防止复制到其他服务器） */
  private getMachineFingerprint(): string {
    const parts: string[] = []

    // 1. 环境变量优先：部署时显式指定稳定指纹
    const envId = (process.env.LICENSE_MACHINE_ID || '').trim()
    if (envId) parts.push(envId)

    // 2. Linux systemd machine-id（docker-compose 已挂载宿主机 /etc/machine-id）
    try {
      const machineId = readFileSync('/etc/machine-id', 'utf8').trim()
      if (machineId) parts.push(machineId)
    } catch {
      // 忽略读取失败
    }

    // 3. 主板/产品 UUID
    try {
      const dmiUuid = readFileSync('/sys/class/dmi/id/product_uuid', 'utf8').trim()
      if (dmiUuid) parts.push(dmiUuid)
    } catch {
      // 忽略读取失败
    }

    // 4. 主板序列号
    try {
      const boardSerial = readFileSync('/sys/class/dmi/id/board_serial', 'utf8').trim()
      if (boardSerial) parts.push(boardSerial)
    } catch {
      // 忽略读取失败
    }

    // 5. hostname 兜底（容器重建可能变化）
    const hostname = os.hostname()
    if (hostname) parts.push(hostname)

    return createHash('sha256').update(parts.join('|')).digest('hex')
  }

  /** 获取 AES-256-GCM 加密密钥（32 字节）：优先 LICENSE_ENCRYPT_KEY，缺省用公钥前 32 字符兜底 */
  private getEncryptKey(): Buffer {
    const env = (process.env.LICENSE_ENCRYPT_KEY || '').trim()
    if (env) {
      const hex = Buffer.from(env, 'hex')
      if (hex.length === 32) return hex
      return Buffer.from(env.padEnd(32, '0').slice(0, 32))
    }
    return Buffer.from(LICENSE_PUBLIC_KEY.replace(/\s/g, '').padEnd(32, '0').slice(0, 32))
  }

  /** 加密 License Key（AES-256-GCM，返回 base64(iv + authTag + ciphertext)） */
  private encryptLicenseKey(plain: string): string {
    const key = this.getEncryptKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  /** 解密 License Key；失败返回 null */
  private decryptLicenseKey(stored: string): string | null {
    try {
      const key = this.getEncryptKey()
      const data = Buffer.from(stored, 'base64')
      const iv = data.subarray(0, 12)
      const authTag = data.subarray(12, 28)
      const ciphertext = data.subarray(28)
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    } catch {
      return null
    }
  }

  /** 解密数据库中的 licenseKey；解密失败（旧版明文数据）时回退原文 */
  private decryptOrFallback(stored: string): string {
    return this.decryptLicenseKey(stored) || stored
  }

  /** 校验 License Key 绑定的机器指纹；payload 未绑定 machineId 时不校验 */
  private verifyMachineBinding(payload: LicensePayload): void {
    const bound = payload.machineId || payload.machineFingerprint
    if (!bound) return
    const local = this.getMachineFingerprint()
    if (local !== bound) {
      throw new Error('License Key 已绑定其他服务器（机器指纹不匹配）')
    }
  }

  /** 过滤非法 featureKey；空数组/全部非法时回退为全量功能（valid/grace 兜底，避免误锁） */
  private sanitizeFeatures(features?: unknown): string[] {
    const valid = ALL_LICENSE_FEATURES as readonly string[]
    if (Array.isArray(features)) {
      const filtered = features.filter(
        (f): f is string => typeof f === 'string' && valid.includes(f),
      )
      if (filtered.length > 0) return filtered
    }
    return [...ALL_LICENSE_FEATURES]
  }

  private isExpired(expiresAt: string): boolean {
    if (!expiresAt) return true
    const exp = new Date(expiresAt).getTime()
    if (Number.isNaN(exp)) return true
    return exp <= Date.now()
  }

  private calcGraceDays(expiresAt: string): number {
    if (!expiresAt) return 0
    const exp = new Date(expiresAt).getTime()
    if (Number.isNaN(exp)) return 0
    const diff = exp - Date.now()
    if (diff <= 0) return 0
    return Math.ceil(diff / 86400000)
  }

  private unauthorizedInfo(): LicenseInfo {
    return {
      status: 'unauthorized',
      expiresAt: '',
      features: [...READ_ONLY_FEATURES],
      graceDaysLeft: 0,
      lockMessage: '系统未授权',
      customer: '',
      customerId: '',
      domain: '',
      activatedAt: '',
    }
  }
}
