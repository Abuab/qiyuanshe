import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AiProviderBalanceService } from './ai-provider-balance.service'
import { AiProviderSelector } from './ai-provider-selector.service'

/**
 * AI Provider 定时任务
 *
 * - 每 30 分钟：查询所有 Provider 余额，检测告警
 * - 每 5 分钟：检查冷却期满的故障 Provider，自动恢复
 */
@Injectable()
export class AiProviderScheduler {
  private readonly logger = new Logger(AiProviderScheduler.name)

  constructor(
    private readonly balanceService: AiProviderBalanceService,
    private readonly selector: AiProviderSelector,
  ) {}

  /** 每 30 分钟：余额检查 */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleBalanceCheck() {
    try {
      const result = await this.balanceService.checkAllBalances()
      if (result.alerted > 0) {
        this.logger.warn(
          `[Scheduler] 余额检查：${result.checked} 个 Provider，${result.alerted} 个告警`,
        )
      }
    } catch (e: any) {
      this.logger.error(`[Scheduler] 余额检查异常: ${e?.message}`)
    }
  }

  /** 每 5 分钟：故障 Provider 恢复检测 */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRecoveryCheck() {
    try {
      const recovered = await this.balanceService.recoverExpiredCooldowns()
      if (recovered > 0) {
        this.logger.log(`[Scheduler] 已自动恢复 ${recovered} 个 Provider`)
      }
    } catch (e: any) {
      this.logger.error(`[Scheduler] 恢复检测异常: ${e?.message}`)
    }
  }

  /** 每天零点：输出昨日成本摘要 */
  @Cron('0 0 * * *')
  async handleDailyReport() {
    // 成本报告（可接入日志/监控系统）
  }
}
