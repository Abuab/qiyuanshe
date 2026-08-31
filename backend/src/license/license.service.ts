import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

export type LicenseStatus = 'valid' | 'grace_period' | 'expired' | 'unauthorized'

export interface LicenseInfo {
  status: LicenseStatus
  expiresAt: string
  features: string[]
  graceDaysLeft: number
  lockMessage: string
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

/** 授权状态在 system_configs 中的存储 key（单条 JSON） */
const LICENSE_CONFIG_KEY = 'license.config'

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {}

  /** 读取授权状态（缺省视为 valid，未配置时不误伤任何接口） */
  async getLicenseInfo(): Promise<LicenseInfo> {
    let raw: string | null = null
    try {
      const config = await this.configRepository.findOne({ where: { configKey: LICENSE_CONFIG_KEY } })
      raw = config?.configValue ?? null
    } catch (error: any) {
      // 数据库异常时 fail-open，避免因配置表故障锁死整个平台
      this.logger.warn(`[License] 读取授权配置失败，按 valid 处理: ${error?.message}`)
    }
    return this.normalize(this.parse(raw))
  }

  /** 判断当前是否授权可用（valid / grace_period 均视为可用） */
  async isActive(): Promise<boolean> {
    const info = await this.getLicenseInfo()
    return info.status === 'valid' || info.status === 'grace_period'
  }

  private parse(raw: string | null): Record<string, any> {
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  private normalize(config: Record<string, any>): LicenseInfo {
    const status: LicenseStatus = ['valid', 'grace_period', 'expired', 'unauthorized'].includes(
      config.status,
    )
      ? config.status
      : 'valid'

    const expiresAt = typeof config.expiresAt === 'string' ? config.expiresAt : ''

    // 功能白名单：过期/未授权时强制只保留只读功能，忽略任何显式写功能配置，
    // 与守卫「按 status 拦截写接口」保持一致，避免前端显示按钮但后端拒绝的体验断层。
    let features: string[]
    if (status === 'expired' || status === 'unauthorized') {
      features = [...READ_ONLY_FEATURES]
    } else if (Array.isArray(config.features) && config.features.length > 0) {
      features = config.features.filter((f) => typeof f === 'string')
    } else {
      features = [...ALL_LICENSE_FEATURES]
    }

    const graceDaysLeft = this.calcGraceDays(expiresAt)

    const lockMessage =
      typeof config.lockMessage === 'string' && config.lockMessage
        ? config.lockMessage
        : status === 'expired'
          ? '系统授权已过期'
          : '系统未授权'

    return { status, expiresAt, features, graceDaysLeft, lockMessage }
  }

  private calcGraceDays(expiresAt: string): number {
    if (!expiresAt) return 0
    const exp = new Date(expiresAt).getTime()
    if (Number.isNaN(exp)) return 0
    const diff = exp - Date.now()
    if (diff <= 0) return 0
    return Math.ceil(diff / 86400000)
  }
}
