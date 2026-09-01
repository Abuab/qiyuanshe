import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createVerify } from 'crypto'
import axios from 'axios'
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
  remoteStatus?: string
  maxActivations: number
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
  maxActivations?: number
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

  /** 激活/更新 License：本地验签 → 许可证服务器在线注册激活（不可达时降级离线激活）→ 写入本地数据库 */
  async activateLicense(licenseKey: string): Promise<LicenseInfo> {
    const payload = this.verifyAndParse(licenseKey)

    // 在线注册激活（校验激活次数并分配 activationId）；网络不可达时降级离线激活，activationId 为 null
    const { activationId } = await this.registerActivation(licenseKey)

    const data = {
      isActivated: true,
      licenseKey,
      activatedAt: new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      features: this.sanitizeFeatures(payload.features),
      customerId: payload.customerId || null,
      customerName: payload.customer || null,
      activationId,
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

  /** 解绑当前服务器：在许可证服务器释放激活名额，并清除本地授权状态 */
  async deactivateLicense(): Promise<void> {
    const license = await this.getActivatedLicense()
    if (!license) return

    const signature = await this.getLicenseSignature()
    if (!signature) {
      throw new Error('未找到已激活授权码，无法解绑')
    }

    const activationId = license.activationId
    if (!activationId) {
      throw new Error('当前授权未记录激活实例 ID，无法在线解绑')
    }

    const serverUrl = this.getServerUrl()
    if (!serverUrl) {
      throw new Error('未配置许可证服务器（LICENSE_SERVER_URL），无法在线解绑')
    }

    try {
      const res = await axios.post(
        `${serverUrl}/deactivate`,
        { licenseSignature: signature, activationId },
        { timeout: 10000, headers: this.getAuthHeaders() },
      )
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || '解绑失败')
      }
    } catch (e: any) {
      if (e?.response?.data?.message) {
        throw new Error(e.response.data.message)
      }
      throw new Error('无法连接许可证服务器，请检查网络或 LICENSE_SERVER_URL 配置')
    }

    await this.licenseRepository.update(license.id, { isActivated: false, activationId: null })
  }

  /** 查询当前授权的激活实例摘要（供管理后台展示「已激活实例数 / 最大激活数」） */
  async getActivationSummary(): Promise<{ maxActivations: number; activationCount: number; activations: unknown[] }> {
    const signature = await this.getLicenseSignature()
    const empty = { maxActivations: 0, activationCount: 0, activations: [] }
    if (!signature) return empty

    const serverUrl = this.getServerUrl()
    if (!serverUrl) return empty

    try {
      const res = await axios.get(`${serverUrl}/activations`, {
        params: { licenseSignature: signature },
        timeout: 10000,
        headers: this.getAuthHeaders(),
      })
      const data = res?.data?.data
      if (data && typeof data === 'object') {
        return {
          maxActivations: Number(data.maxActivations) || 0,
          activationCount: Number(data.activationCount) || 0,
          activations: Array.isArray(data.activations) ? data.activations : [],
        }
      }
    } catch (e: any) {
      this.logger.warn(`[License] 查询激活实例失败：${e?.message || e}`)
    }
    return empty
  }

  /** 调用许可证服务器注册激活；达上限抛出错误，网络不可达降级离线激活（返回 activationId=null） */
  private async registerActivation(licenseKey: string): Promise<{ activationId: string | null }> {
    const serverUrl = this.getServerUrl()
    if (!serverUrl) {
      this.logger.warn('[License] 未配置 LICENSE_SERVER_URL，降级为离线激活')
      return { activationId: null }
    }

    // 重复激活同一授权时带上已记录的 activationId，避免重复占用名额
    const existing = await this.getActivatedLicense()

    try {
      const res = await axios.post(
        `${serverUrl}/activate`,
        {
          licenseKey,
          activationId: existing?.activationId || undefined,
          domain: process.env.APP_DOMAIN || '',
        },
        { timeout: 10000, headers: this.getAuthHeaders() },
      )
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || '激活失败')
      }
      const activationId = res?.data?.activationId
      return { activationId: activationId != null ? String(activationId) : null }
    } catch (e: any) {
      if (e?.response?.data?.message) {
        throw new Error(e.response.data.message)
      }
      // 网络类错误（无响应）：降级为离线激活，本地验签已通过
      this.logger.warn(`[License] 许可证服务器不可达，降级为离线激活：${e?.message || e}`)
      return { activationId: null }
    }
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

  /** 获取当前激活实例 ID（许可证服务器分配，心跳上报用） */
  async getActivationId(): Promise<string | null> {
    const license = await this.getActivatedLicense()
    return license?.activationId || null
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
      activatedAt: license.activatedAt ? license.activatedAt.toISOString() : '',
      remoteStatus: license.remoteStatus,
      maxActivations:
        Number.isInteger(payload.maxActivations) && (payload.maxActivations as number) > 0
          ? (payload.maxActivations as number)
          : 1,
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
      activatedAt: '',
      remoteStatus: 'valid',
      maxActivations: 1,
    }
  }

  /**
   * 读取许可证服务器地址（预留寻址入口）。
   * 当前从环境变量读取；未来换域名/换 IP 可在此处改为从配置中心（如 github/gitee 仓库）
   * 动态拉取最新地址，客户侧无需手动改 .env。
   */
  private getServerUrl(): string {
    return (process.env.LICENSE_SERVER_URL || '').trim().replace(/\/+$/, '')
  }

  /** 构造调用许可证服务器时的鉴权头（方案 E：客户端接口共享密钥鉴权） */
  private getAuthHeaders(): Record<string, string> {
    const secret = (process.env.LICENSE_SERVER_SECRET || '').trim()
    return secret ? { 'X-License-Secret': secret } : {}
  }

  /** 离线激活后的在线对账：补齐 activationId，恢复在线解绑与激活计数能力 */
  async reconcileOfflineActivation(): Promise<void> {
    const license = await this.getActivatedLicense()
    if (!license || license.activationId) return

    try {
      const { activationId } = await this.registerActivation(license.licenseKey)
      if (activationId) {
        await this.licenseRepository.update(license.id, { activationId })
        this.logger.log(`[License] 离线激活对账完成，已补齐 activationId: ${activationId}`)
      }
    } catch (e: any) {
      // 达上限等业务错误不锁定客户，保持离线可用；网络失败下次心跳再试
      this.logger.warn(`[License] 离线激活对账失败，保持离线状态：${e?.message || e}`)
    }
  }
}
