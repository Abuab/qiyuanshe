import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../common/redis.service'
import { LoadBalanceStrategy } from '../entities/AiProviderConfig'
import { AiProviderConfigService } from './ai-provider-config.service'
import {
  AiProviderSnapshot,
  PROVIDER_ACTIVE_KEY,
  PROVIDER_STRATEGY_KEY,
  PROVIDER_COOLDOWN_PREFIX,
  PROVIDER_FAILS_PREFIX,
  PROVIDER_RR_KEY,
  FAILURE_THRESHOLD,
  COOLDOWN_SECONDS,
} from './ai-provider.types'

/**
 * AI Provider 动态选择器
 *
 * 策略：
 * - WEIGHTED：按权重随机分配（权重越高，被选中概率越大）
 * - PRIMARY_BACKUP：始终选优先级最高的可用 Provider，有故障时切换
 * - ROUND_ROBIN：轮询选择
 *
 * 故障 Provider 进入冷却期，冷却期满自动恢复
 */
@Injectable()
export class AiProviderSelector {
  private readonly logger = new Logger(AiProviderSelector.name)

  constructor(
    private readonly configService: AiProviderConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 选择一个可用的 Provider
   */
  async select(): Promise<AiProviderSnapshot | null> {
    const snapshots = await this.configService.getEnabledSnapshots()
    const available = await this.filterAvailable(snapshots)

    if (available.length === 0) {
      this.logger.error('没有可用的 AI Provider！')
      return null
    }

    const strategy = await this.getCurrentStrategy()

    switch (strategy) {
      case LoadBalanceStrategy.PRIMARY_BACKUP:
        return this.selectPrimaryBackup(available)
      case LoadBalanceStrategy.ROUND_ROBIN:
        return await this.selectRoundRobin(available)
      case LoadBalanceStrategy.WEIGHTED:
      default:
        return this.selectWeighted(available)
    }
  }

  /**
   * 记录调用成功
   */
  async recordSuccess(providerId: number): Promise<void> {
    await this.redis.del(`${PROVIDER_FAILS_PREFIX}${providerId}`)
  }

  /**
   * 记录调用失败 → 判断是否需要进入冷却期
   * 返回 true 表示该 Provider 已进入冷却期（不可用），调用方应重新选择
   */
  async recordFailure(providerId: number): Promise<boolean> {
    const key = `${PROVIDER_FAILS_PREFIX}${providerId}`
    const count = await this.redis.incr(key)
    await this.redis.expire(key, 300) // 5分钟内有效

    if (count >= FAILURE_THRESHOLD) {
      this.logger.warn(`[Provider] Provider ${providerId} 连续失败 ${count} 次，进入冷却期`)
      await this.setCooldown(providerId)
      return true
    }
    return false
  }

  /**
   * 检查 Provider 是否在冷却期内
   */
  async isInCooldown(providerId: number): Promise<boolean> {
    const key = `${PROVIDER_COOLDOWN_PREFIX}${providerId}`
    const val = await this.redis.get(key)
    return !!val
  }

  /**
   * 手动恢复 Provider（管理员主动恢复或定时任务检查冷却期满）
   */
  async recover(providerId: number): Promise<void> {
    await this.redis.del(`${PROVIDER_COOLDOWN_PREFIX}${providerId}`)
    await this.redis.del(`${PROVIDER_FAILS_PREFIX}${providerId}`)
    this.logger.log(`[Provider] Provider ${providerId} 已恢复`)
  }

  /**
   * 获取所有冷却中的 Provider ID 列表
   */
  async getCooldownList(): Promise<number[]> {
    // 简单实现：逐条检查（Provider 数量通常很少，<10个）
    const snapshots = await this.configService.getEnabledSnapshots()
    const result: number[] = []
    for (const s of snapshots) {
      if (await this.isInCooldown(s.id)) result.push(s.id)
    }
    return result
  }

  // ==================== 内部方法 ====================

  private async filterAvailable(snapshots: AiProviderSnapshot[]): Promise<AiProviderSnapshot[]> {
    const available: AiProviderSnapshot[] = []
    for (const s of snapshots) {
      if (!s.isEnabled) continue
      if (await this.isInCooldown(s.id)) continue
      available.push(s)
    }
    return available
  }

  private async getCurrentStrategy(): Promise<LoadBalanceStrategy> {
    const cached = await this.redis.get(PROVIDER_STRATEGY_KEY)
    if (cached) return cached as LoadBalanceStrategy
    return LoadBalanceStrategy.WEIGHTED
  }

  /** 主备模式：按优先级排序，取第一个可用的 */
  private selectPrimaryBackup(snapshots: AiProviderSnapshot[]): AiProviderSnapshot {
    const sorted = [...snapshots].sort((a, b) => a.priority - b.priority)
    return sorted[0]
  }

  /** 轮询模式（Redis INCR 全局计数，多实例共享） */
  private async selectRoundRobin(snapshots: AiProviderSnapshot[]): Promise<AiProviderSnapshot> {
    const globalIndex = await this.redis.incr(PROVIDER_RR_KEY)
    // 定期清理计数器，避免无限制增长（不影响取模结果，仅防溢出）
    if (globalIndex > 1000000) {
      await this.redis.getClient().set(PROVIDER_RR_KEY, '0')
    }
    const idx = globalIndex % snapshots.length
    return snapshots[idx]
  }

  /** 加权随机模式 */
  private selectWeighted(snapshots: AiProviderSnapshot[]): AiProviderSnapshot {
    const totalWeight = snapshots.reduce((sum, s) => sum + s.weight, 0)
    let random = Math.random() * totalWeight
    for (const s of snapshots) {
      random -= s.weight
      if (random <= 0) return s
    }
    return snapshots[snapshots.length - 1]
  }

  private async setCooldown(providerId: number): Promise<void> {
    const key = `${PROVIDER_COOLDOWN_PREFIX}${providerId}`
    await this.redis.set(key, '1', COOLDOWN_SECONDS)
  }
}
