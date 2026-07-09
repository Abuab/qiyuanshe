import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiProviderConfigService } from './ai-provider-config.service'
import { AiProviderBalance, BalanceAlertStatus } from '../entities/AiProviderBalance'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderSelector } from './ai-provider-selector.service'
import { decryptApiKey } from './ai-crypto.util'
import { beijingISO } from '../common/utils/date-utils'
import {
  BalanceAlertRecord,
  PROVIDER_ALERT_PREFIX,
  BALANCE_CHECK_INTERVAL_SECONDS,
  ALERT_DOWNGRADE_COUNT,
} from './ai-provider.types'

/**
 * AI Provider 余额监控与告警 Service
 *
 * - 定时任务查询各 Provider 余额
 * - 低于阈值 → 告警
 * - 连续告警 3 次 → 自动禁用该 Provider
 * - 余额恢复 → 自动解除告警并重新启用
 */
@Injectable()
export class AiProviderBalanceService {
  private readonly logger = new Logger(AiProviderBalanceService.name)

  constructor(
    @InjectRepository(AiProviderBalance)
    private readonly balanceRepo: Repository<AiProviderBalance>,
    @InjectRepository(AiProviderConfig)
    private readonly configRepo: Repository<AiProviderConfig>,
    private readonly configService: AiProviderConfigService,
    private readonly selector: AiProviderSelector,
    private readonly redis: RedisService,
  ) {}

  // ==================== 定时任务 ====================

  /** 检查所有 Provider 余额（定时任务每 30 分钟触发） */
  async checkAllBalances(): Promise<{ checked: number; alerted: number }> {
    const configs = await this.configRepo.find({
      where: { isEnabled: 1, isDeleted: 0 },
    })

    let checked = 0
    let alerted = 0

    for (const cfg of configs) {
      if (!cfg.balanceQueryUrl) continue

      try {
        const balance = await this.queryBalanceFromProvider(cfg)
        checked++

        const record = await this.updateBalanceRecord(cfg.id, balance)
        if (record.alertStatus === BalanceAlertStatus.ALERTING) {
          alerted++
        }
      } catch (e: any) {
        this.logger.warn(`查询 Provider ${cfg.displayName} 余额失败: ${e?.message}`)
      }
    }

    if (alerted > 0) {
      this.logger.warn(`[BalanceCheck] ${checked} 个 Provider 中 ${alerted} 个处于告警状态`)
    }
    return { checked, alerted }
  }

  /** 检查并恢复冷却期满的故障 Provider */
  async recoverExpiredCooldowns(): Promise<number> {
    const configs = await this.configRepo.find({
      where: { isEnabled: 1, isDeleted: 0 },
    })

    let recovered = 0
    for (const cfg of configs) {
      if (!(await this.selector.isInCooldown(cfg.id))) continue
      // 冷却期满会自动过期 Redis key，此处检查并清理
      // 同时检查故障计数器是否也已过期
      await this.selector.recover(cfg.id)
      recovered++
      this.logger.log(`[Recover] Provider ${cfg.displayName} 冷却期满，已自动恢复`)
    }
    return recovered
  }

  // ==================== 查询接口 ====================

  /** 获取所有余额告警记录 */
  async getAlerts(): Promise<BalanceAlertRecord[]> {
    const records = await this.balanceRepo.find({
      where: { alertStatus: BalanceAlertStatus.ALERTING },
      relations: ['provider'],
      order: { lastAlertAt: 'DESC' },
    })

    return records.map(r => ({
      id: r.id,
      providerId: r.providerId,
      providerName: r.provider?.displayName || '未知',
      currentBalance: r.currentBalance,
      alertThreshold: r.alertThreshold,
      alertStatus: r.alertStatus,
      alertCount: r.alertCount,
      lastQueryAt: r.lastQueryAt?.toISOString?.(),
      lastAlertAt: r.lastAlertAt?.toISOString?.(),
    }))
  }

  /** 手动触发单个 Provider 余额查询 */
  async queryProviderBalance(providerId: number): Promise<BalanceAlertRecord> {
    const cfg = await this.configRepo.findOne({ where: { id: providerId } })
    if (!cfg) throw new Error('Provider 不存在')

    const balance = await this.queryBalanceFromProvider(cfg)
    const record = await this.updateBalanceRecord(providerId, balance)

    return {
      id: record.id,
      providerId: record.providerId,
      providerName: cfg.displayName,
      currentBalance: record.currentBalance,
      alertThreshold: record.alertThreshold,
      alertStatus: record.alertStatus,
      alertCount: record.alertCount,
      lastQueryAt: record.lastQueryAt ? beijingISO(record.lastQueryAt) : undefined,
      lastAlertAt: record.lastAlertAt ? beijingISO(record.lastAlertAt) : undefined,
    }
  }

  // ==================== 内部方法 ====================

  /**
   * 从 Provider API 查询余额
   *
   * 各厂商接口不同，此处实现通用策略：
   * - OpenRouter: GET /api/v1/auth/key → { data: { limits: { ... } } }
   * - 其他厂商：通过 /models 或 /dashboard 查询
   * - 暂不支持则返回 -1（表示未知）
   */
  private async queryBalanceFromProvider(cfg: AiProviderConfig): Promise<number> {
    // 【设计说明】
    // 各厂商余额查询接口差异较大，此处通过 providerKey 路由：
    // - openrouter → GET {apiBase}/auth/key  Header: Authorization: Bearer {key}
    // - deepseek   → 无公开余额接口，返回 -1
    // - kimi/moonshot → GET {apiBase}/v1/users/me/balance
    // - 通义千问   → 无公开余额接口，返回 -1
    // 具体实现需根据实际接入的厂商补充

    try {
      const apiKey = decryptApiKey(cfg.apiKeyEncrypted)

      if (cfg.providerKey === 'openrouter') {
        const resp = await fetch(`${cfg.apiBase.replace('/api/v1', '')}/api/v1/auth/key`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        if (resp.ok) {
          const data = await resp.json()
          return data?.data?.limits?.remaining || 0
        }
      }

      if (cfg.providerKey === 'kimi' || cfg.providerKey === 'moonshot') {
        const resp = await fetch(`${cfg.apiBase}/v1/users/me/balance`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        if (resp.ok) {
          const data = await resp.json()
          return data?.data?.available_balance ?? data?.data?.balance ?? 0
        }
      }

      return -1 // 不支持余额查询
    } catch {
      return -1
    }
  }

  /**
   * 更新余额记录并判断告警状态
   */
  private async updateBalanceRecord(providerId: number, balance: number): Promise<AiProviderBalance> {
    let record = await this.balanceRepo.findOne({ where: { providerId } })

    if (!record) {
      record = this.balanceRepo.create({
        providerId,
        currentBalance: balance,
        alertThreshold: 0,
        alertStatus: BalanceAlertStatus.NORMAL,
        alertCount: 0,
      })
    }

    const prevBalance = record.currentBalance
    record.currentBalance = balance
    record.lastQueryAt = new Date()

    // 判断告警
    if (balance >= 0 && record.alertThreshold > 0 && balance < record.alertThreshold) {
      record.alertStatus = BalanceAlertStatus.ALERTING
      record.alertCount++
      record.lastAlertAt = new Date()

      this.logger.warn(
        `[Balance] Provider ${providerId} 余额 ${balance} 低于阈值 ${record.alertThreshold}，连续告警 ${record.alertCount} 次`,
      )

      // 连续告警 3 次 → 自动禁用
      if (record.alertCount >= ALERT_DOWNGRADE_COUNT) {
        this.logger.error(`[Balance] Provider ${providerId} 连续告警 ${ALERT_DOWNGRADE_COUNT} 次，自动禁用`)
        await this.configService.update(providerId, { isEnabled: false })
        await this.redis.set(
          `${PROVIDER_ALERT_PREFIX}${providerId}`,
          'downgraded',
          0,
        )
      }
    } else if (balance >= 0 && balance >= record.alertThreshold) {
      // 余额恢复 → 解除告警
      if (record.alertStatus !== BalanceAlertStatus.NORMAL) {
        record.alertStatus = BalanceAlertStatus.NORMAL
        record.alertCount = 0
        this.logger.log(`[Balance] Provider ${providerId} 余额已恢复至 ${balance}`)

        // 如果之前被自动禁用，重新启用
        const downgraded = await this.redis.get(`${PROVIDER_ALERT_PREFIX}${providerId}`)
        if (downgraded === 'downgraded') {
          await this.configService.update(providerId, { isEnabled: true })
          await this.redis.del(`${PROVIDER_ALERT_PREFIX}${providerId}`)
        }
      }
    }

    return this.balanceRepo.save(record)
  }
}
