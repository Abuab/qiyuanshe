import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { AiProviderCallLog } from '../entities/AiProviderCallLog'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { CostStats, CallTypeStats, TOKEN_PRICE_MAP } from './ai-provider.types'

/**
 * AI Provider 成本统计 Service
 *
 * - 按 Provider 统计每日/每周/每月调用量和费用
 * - 按功能类型统计调用分布
 */
@Injectable()
export class AiProviderStatsService {
  private readonly logger = new Logger(AiProviderStatsService.name)

  constructor(
    @InjectRepository(AiProviderCallLog)
    private readonly callLogRepo: Repository<AiProviderCallLog>,
    @InjectRepository(AiProviderConfig)
    private readonly configRepo: Repository<AiProviderConfig>,
  ) {}

  /**
   * 按 Provider 统计指定时间范围的成本
   *
   * @param startDate 开始日期
   * @param endDate   结束日期
   * @returns 各 Provider 的成本统计列表
   */
  async getCostStats(startDate: Date, endDate: Date): Promise<CostStats[]> {
    const configs = await this.configRepo.find({ where: { isDeleted: 0 } })
    const configMap = new Map(configs.map(c => [c.id, c]))

    const stats: CostStats[] = []

    for (const cfg of configs) {
      const calls = await this.callLogRepo.find({
        where: {
          providerId: cfg.id,
          createdAt: Between(startDate, endDate),
        },
      })

      const successCalls = calls.filter(c => c.status === 'success')
      const failedCalls = calls.filter(c => c.status === 'error' || c.status === 'timeout')
      const totalInputTokens = calls.reduce((s, c) => s + c.inputTokens, 0)
      const totalOutputTokens = calls.reduce((s, c) => s + c.outputTokens, 0)
      const avgDurationMs = calls.length > 0
        ? Math.round(calls.reduce((s, c) => s + c.durationMs, 0) / calls.length)
        : 0

      const tokenPrice = TOKEN_PRICE_MAP[cfg.modelName] || 0.005
      const estimatedCost = ((totalInputTokens + totalOutputTokens) / 1000) * tokenPrice

      stats.push({
        providerId: cfg.id,
        providerName: cfg.displayName,
        totalCalls: calls.length,
        successCalls: successCalls.length,
        failedCalls: failedCalls.length,
        totalInputTokens,
        totalOutputTokens,
        estimatedCost: Math.round(estimatedCost * 10000) / 10000,
        avgDurationMs,
      })
    }

    return stats.sort((a, b) => b.totalCalls - a.totalCalls)
  }

  /**
   * 每日成本统计
   */
  async getDailyStats(): Promise<CostStats[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return this.getCostStats(today, tomorrow)
  }

  /**
   * 按功能类型统计调用分布
   */
  async getCallTypeStats(startDate: Date, endDate: Date): Promise<CallTypeStats[]> {
    const calls = await this.callLogRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['provider'],
    })

    const typeMap = new Map<string, { total: number; byProvider: Record<string, number> }>()

    for (const call of calls) {
      const type = call.callType
      if (!typeMap.has(type)) {
        typeMap.set(type, { total: 0, byProvider: {} })
      }
      const entry = typeMap.get(type)!
      entry.total++
      const pName = call.provider?.displayName || `ID:${call.providerId}`
      entry.byProvider[pName] = (entry.byProvider[pName] || 0) + 1
    }

    return Array.from(typeMap.entries()).map(([callType, data]) => ({
      callType,
      totalCalls: data.total,
      byProvider: data.byProvider,
    }))
  }

  /**
   * 获取总调用量摘要（管理后台仪表盘用）
   */
  async getSummary(): Promise<{
    todayCalls: number
    todayCost: number
    activeProviders: number
    totalProviders: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayLogs = await this.callLogRepo.find({
      where: { createdAt: Between(today, tomorrow) },
    })

    const todayCalls = todayLogs.length
    const totalTokens = todayLogs.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0)
    const todayCost = Math.round((totalTokens / 1000) * 0.005 * 10000) / 10000

    const allProviders = await this.configRepo.find({ where: { isDeleted: 0 } })
    const activeProviders = allProviders.filter(p => p.isEnabled === 1).length

    return {
      todayCalls,
      todayCost,
      activeProviders,
      totalProviders: allProviders.length,
    }
  }
}
