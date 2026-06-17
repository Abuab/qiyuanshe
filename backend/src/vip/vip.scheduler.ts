import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VipService } from './vip.service'

/**
 * 会员定时任务
 */
@Injectable()
export class VipScheduler {
  constructor(private readonly vipService: VipService) {}

  /**
   * 每天 0:05 重置置顶卡配额
   */
  @Cron('5 0 * * *')
  async handleQuotaReset() {
    const count = await this.vipService.dailyQuotaReset()
    console.log(`[VipScheduler] 置顶卡配额重置完成，生成 ${count} 条配额记录`)
  }

  /**
   * 每小时检查一次过期会员并降级
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredVip() {
    const count = await this.vipService.checkExpiredVip()
    if (count > 0) {
      console.log(`[VipScheduler] 已降级 ${count} 名过期会员`)
    }
  }
}
