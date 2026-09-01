import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createVerify, createHash } from 'crypto'
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
  machineFingerprint?: string
  activatedAt?: string
  remoteStatus?: string
}

/** 授权码中签发的载荷（不含签名） */
export interface LicensePayload {
  customer: string
  customerId?: string
  domain?: string
  machineFingerprint?: string
  status?: 'valid' | 'grace_period' | 'expired'
  expiresAt: string
  features?: string[]
  issuedAt?: string
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

/** 远程吊销后的宽限期（天） */
const REVOKED_GRACE_DAYS = 7

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

  /** 读取当前授权状态。未激活/验签失败/数据库异常一律按 unauthorized（fail-closed，防破解优先）。 */
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
      const payload = this.verifyAndParse(license.licenseKey)
      const local = this.buildLocalInfo(payload, license)
      return this.applyRemoteStatus(local, license)
    } catch (error: any) {
      this.logger.error(`[License] 授权码验签失败，按未授权处理: ${error?.message}`)
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

  /** 激活/更新 License：验签通过后写入数据库（单条记录） */
  async activateLicense(licenseKey: string): Promise<LicenseInfo> {
    const payload = this.verifyAndParse(licenseKey)

    // 机器指纹可选绑定：仅当授权码显式携带非空 machineFingerprint 时才校验
    if (payload.machineFingerprint) {
      const current = this.generateMachineFingerprint()
      if (current !== payload.machineFingerprint) {
        throw new Error('License Key 绑定的机器指纹与当前服务器不匹配')
      }
    }

    const data = {
      isActivated: true,
      licenseKey,
      activatedAt: new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      features: this.sanitizeFeatures(payload.features),
      customerId: payload.customerId || null,
      customerName: payload.customer || null,
      machineFingerprint: payload.machineFingerprint || null,
      remoteStatus: 'valid',
      remoteStatusUpdatedAt: null,
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

  /** 更新远程状态（心跳服务调用）。仅处理 revoked（吊销）与 valid（恢复）。 */
  async updateRemoteStatus(status: string): Promise<void> {
    const license = await this.getActivatedLicense()
    if (!license) return

    if (status === 'revoked') {
      await this.licenseRepository.update(license.id, {
        remoteStatus: 'revoked',
        remoteStatusUpdatedAt: new Date(),
      })
    } else if (status === 'valid') {
      await this.licenseRepository.update(license.id, {
        remoteStatus: 'valid',
        remoteStatusUpdatedAt: null,
      })
    }
    // expired / not_found 等状态不改变本地远程状态（本地授权码过期时间兜底）
  }

  /** 获取当前激活授权码的签名（心跳上报用，作为许可证服务器唯一标识） */
  async getLicenseSignature(): Promise<string | null> {
    const license = await this.getActivatedLicense()
    if (!license) return null
    try {
      const raw = JSON.parse(Buffer.from(license.licenseKey, 'base64').toString('utf8'))
      return typeof raw?.signature === 'string' ? raw.signature : null
    } catch {
      return null
    }
  }

  /** 生成机器指纹（主机名 + CPU 型号 + 网卡 MAC 的 SHA256），供可选绑定使用 */
  generateMachineFingerprint(): string {
    const parts = [
      os.hostname(),
      os.cpus()[0]?.model || '',
      Object.values(os.networkInterfaces())
        .flat()
        .map((i) => i?.mac)
        .filter(Boolean)
        .join(','),
    ]
    return createHash('sha256').update(parts.join('|')).digest('hex')
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

  /** 基于本地验签 + 本地过期时间推导状态（不含远程吊销） */
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
      machineFingerprint: payload.machineFingerprint || '',
      activatedAt: license.activatedAt ? license.activatedAt.toISOString() : '',
      remoteStatus: license.remoteStatus,
    }
  }

  /** 合并远程吊销状态：revoked 进入 7 天宽限期，超期后锁定 */
  private applyRemoteStatus(local: LicenseInfo, license: SystemLicense): LicenseInfo {
    // 本地已失效，直接返回（本地过期优先）
    if (local.status === 'expired' || local.status === 'unauthorized') {
      return local
    }

    if (license.remoteStatus === 'revoked') {
      const revokedAt = license.remoteStatusUpdatedAt?.getTime() || 0
      const graceMs = REVOKED_GRACE_DAYS * 86400000
      const remainingMs = revokedAt + graceMs - Date.now()

      if (remainingMs > 0) {
        // 宽限期内：仍可用，展示即将锁定提示
        return {
          ...local,
          status: 'grace_period',
          graceDaysLeft: Math.ceil(remainingMs / 86400000),
          lockMessage: '授权已被吊销，请在宽限期内联系管理员',
        }
      }
      // 宽限期已过：锁定为未授权
      return {
        ...local,
        status: 'unauthorized',
        features: [...READ_ONLY_FEATURES],
        graceDaysLeft: 0,
        lockMessage: '授权已被吊销',
      }
    }

    return local
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
      machineFingerprint: '',
      activatedAt: '',
      remoteStatus: 'valid',
    }
  }
}
