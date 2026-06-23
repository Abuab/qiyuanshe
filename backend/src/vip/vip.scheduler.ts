import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { VipService } from './vip.service'
import { RedisService } from '../common/redis.service'

/**
 * 会员定时任务
 * 通过 Redis 分布式锁防止多实例重复执行
 */
@Injectable()
export class VipScheduler {
  constructor(
    private readonly vipService: VipService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 每天 0:05 重置置顶卡配额
   * 锁过期时间 10 分钟，防止极端情况下任务未完成锁已释放
   */
  @Cron('5 0 * * *')
  async handleQuotaReset() {
    const lockKey = 'cron:quota:reset'
    const acquired = await this.redis.getClient().set(lockKey, '1', 'EX', 600, 'NX')
    if (!acquired) return

    try {
      const count = await this.vipService.dailyQuotaReset()
      console.log(`[VipScheduler] 置顶卡配额重置完成，生成 ${count} 条配额记录`)
    } finally {
      await this.redis.del(lockKey).catch(() => {})
    }
  }

  /**
   * 每小时检查一次过期会员并降级
   * 锁过期时间 5 分钟
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredVip() {
    const lockKey = 'cron:expired:vip'
    const acquired = await this.redis.getClient().set(lockKey, '1', 'EX', 300, 'NX')
    if (!acquired) return

    try {
      const count = await this.vipService.checkExpiredVip()
      if (count > 0) {
        console.log(`[VipScheduler] 已降级 ${count} 名过期会员`)
      }
    } finally {
      await this.redis.del(lockKey).catch(() => {})
    }
  }
}
