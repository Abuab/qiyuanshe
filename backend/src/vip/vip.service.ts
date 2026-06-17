import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { VipPackage } from '../entities/VipPackage'
import { UserTopRecord } from '../entities/UserTopRecord'
import { UserTopCardQuota } from '../entities/UserTopCardQuota'
import { RedisService } from '../common/redis.service'

function generateOrderNo(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `VIP${ts}${rand}`.toUpperCase()
}

/** 获取今日日期字符串 YYYY-MM-DD（UTC+8） */
function todayStr(): string {
  const d = new Date()
  // UTC+8 校正
  const local = new Date(d.getTime() + 8 * 3600_000)
  return local.toISOString().slice(0, 10)
}

@Injectable()
export class VipService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(VipOrder)
    private readonly orderRepo: Repository<VipOrder>,
    @InjectRepository(VipPackage)
    private readonly packageRepo: Repository<VipPackage>,
    @InjectRepository(UserTopRecord)
    private readonly topRecordRepo: Repository<UserTopRecord>,
    @InjectRepository(UserTopCardQuota)
    private readonly quotaRepo: Repository<UserTopCardQuota>,
    private readonly redis: RedisService,
  ) {}

  // ========================================================================
  //  套餐展示（用户端）
  // ========================================================================

  async listPackages() {
    return this.packageRepo.find({
      where: { status: 1, isDeleted: 0 },
      order: { sortOrder: 'DESC', id: 'ASC' },
    })
  }

  // ========================================================================
  //  购买会员流程
  // ========================================================================

  /**
   * 创建订单
   */
  async createOrder(userId: number, packageId: number, payType = 'wechat') {
    const pkg = await this.packageRepo.findOne({ where: { id: packageId, status: 1, isDeleted: 0 } })
    if (!pkg) throw new Error('套餐不存在或已下架')

    const orderNo = generateOrderNo()
    const order = this.orderRepo.create({
      userId,
      packageId: pkg.id,
      orderNo,
      vipLevel: 1,
      amount: pkg.price,
      payType,
      status: 0, // 待支付
    })
    await this.orderRepo.save(order)

    // 返回给前端用于调起支付
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      amount: Number(pkg.price),
      packageName: pkg.name,
      durationDays: pkg.durationDays,
    }
  }

  /**
   * 支付成功回调（模拟微信支付回调）
   * 真实环境：由 /payment/notify 调用此方法
   */
  async handlePaymentSuccess(orderNo: string, transactionId?: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNo },
      relations: ['package'],
    })
    if (!order) throw new Error('订单不存在')
    if (order.status === 1) return { success: true, message: '已处理' }

    const pkg = order.package
    if (!pkg) throw new Error('套餐不存在')

    // === 事务：更新订单 + 激活会员 + 发放配额 ===
    const now = new Date()
    const expireTime = new Date(now.getTime() + pkg.durationDays * 86_400_000)

    // 1. 更新订单
    order.status = 1
    order.paidAt = now
    order.expireTime = expireTime
    order.transactionId = transactionId || ''
    await this.orderRepo.save(order)

    // 2. 激活会员
    const user = await this.userRepo.findOne({ where: { id: order.userId } })
    if (user) {
      user.isVip = 1
      user.vipLevel = Math.max(user.vipLevel || 0, order.vipLevel)
      // 如果已有会员且在有效期内，则延长
      if (user.vipExpireTime && user.vipExpireTime > now) {
        user.vipExpireTime = new Date(user.vipExpireTime.getTime() + pkg.durationDays * 86_400_000)
      } else {
        user.vipExpireTime = expireTime
      }
      await this.userRepo.save(user)
    }

    // 3. 发放今日置顶卡额度
    if (pkg.dailyTopCards > 0) {
      const today = todayStr()
      let quota = await this.quotaRepo.findOne({
        where: { userId: order.userId, date: today as any, isDeleted: 0 },
      })
      if (quota) {
        quota.totalQuota += pkg.dailyTopCards
      } else {
        quota = this.quotaRepo.create({
          userId: order.userId,
          date: today as any,
          totalQuota: pkg.dailyTopCards,
          usedCount: 0,
          vipPackageId: pkg.id,
        })
      }
      await this.quotaRepo.save(quota)
    }

    // 4. 清除缓存
    await this.redis.del(`recommend:score:${order.userId}`)

    return { success: true, orderId: order.id, expireTime }
  }

  // ========================================================================
  //  置顶卡系统
  // ========================================================================

  /**
   * 查询用户今日置顶卡状态
   */
  async getTopCardStatus(userId: number) {
    const today = todayStr()
    const quota = await this.quotaRepo.findOne({
      where: { userId, date: today as any, isDeleted: 0 },
    })

    // 当前有效的置顶记录
    const now = new Date()
    const activeTop = await this.topRecordRepo.findOne({
      where: { userId, status: 1, topEndTime: MoreThan(now) },
      order: { topEndTime: 'DESC' },
    })

    return {
      todayRemaining: quota ? Math.max(0, quota.totalQuota - quota.usedCount) : 0,
      todayTotal: quota ? quota.totalQuota : 0,
      todayUsed: quota ? quota.usedCount : 0,
      isPinned: !!activeTop,
      pinnedUntil: activeTop?.topEndTime || null,
    }
  }

  /**
   * 使用置顶卡
   */
  async useTopCard(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new Error('用户不存在')

    // 检查是否已经置顶中
    const now = new Date()
    const activeTop = await this.topRecordRepo.findOne({
      where: { userId, status: 1, topEndTime: MoreThan(now) },
    })
    if (activeTop) {
      throw new Error('您当前正在置顶中，有效期至 ' + activeTop.topEndTime.toISOString().slice(0, 16))
    }

    // 检查会员状态
    if (!user.isVip || !user.vipExpireTime || user.vipExpireTime <= now) {
      throw new Error('会员已过期，请先续费')
    }

    // 读取套餐配置（取最新订单关联的套餐）
    const latestOrder = await this.orderRepo.findOne({
      where: { userId, status: 1 },
      order: { paidAt: 'DESC' },
      relations: ['package'],
    })
    if (!latestOrder?.package) throw new Error('未找到有效的会员套餐')
    const pkg = latestOrder.package

    const today = todayStr()
    const quota = await this.quotaRepo.findOne({
      where: { userId, date: today as any, isDeleted: 0 },
    })

    if (!quota || quota.usedCount >= quota.totalQuota) {
      throw new Error('今日置顶卡已用完，明天再来吧')
    }

    // 扣除次数
    quota.usedCount += 1
    await this.quotaRepo.save(quota)

    // 写入置顶记录
    const topHours = pkg.topCardValidHours || 24
    const topEndTime = new Date(now.getTime() + topHours * 3600_000)

    const record = this.topRecordRepo.create({
      userId,
      topStartTime: now,
      topEndTime,
      source: 'purchase',
      status: 1,
    })
    await this.topRecordRepo.save(record)

    // 同时更新 user.pinnedExpireAt（推荐系统快速判断用）
    user.pinnedExpireAt = topEndTime
    await this.userRepo.save(user)

    // 清除推荐缓存
    await this.redis.del(`recommend:score:${userId}`)

    return {
      success: true,
      pinnedUntil: topEndTime,
      remaining: quota.totalQuota - quota.usedCount,
    }
  }

  // ========================================================================
  //  会员状态定时检查
  // ========================================================================

  /**
   * 定时任务：检查并降级过期会员
   * 建议每天凌晨 1 点执行一次
   */
  async checkExpiredVip(): Promise<number> {
    const now = new Date()
    const expiredUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isVip = :vip', { vip: 1 })
      .andWhere('user.vipExpireTime IS NOT NULL')
      .andWhere('user.vipExpireTime <= :now', { now })
      .getMany()

    let count = 0
    for (const user of expiredUsers) {
      user.isVip = 0
      user.vipLevel = 0
      user.vipExpireTime = null
      await this.userRepo.save(user)

      // 清理置顶卡额度
      await this.quotaRepo.update(
        { userId: user.id, isDeleted: 0 },
        { isDeleted: 1 },
      )

      // 结束进行中的置顶
      await this.topRecordRepo.update(
        { userId: user.id, status: 1 },
        { status: 2 },
      )

      // 清除缓存
      await this.redis.del(`recommend:score:${user.id}`)

      count++
    }

    return count
  }

  // ========================================================================
  //  每日配额重置（定时任务，每天 0 点执行）
  //  为所有有效会员生成当天置顶卡配额
  // ========================================================================

  async dailyQuotaReset(): Promise<number> {
    const now = new Date()
    const vipUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isVip = :vip', { vip: 1 })
      .andWhere('user.vipExpireTime > :now', { now })
      .getMany()

    const today = todayStr()
    let count = 0

    for (const user of vipUsers) {
      // 查找最新有效订单对应的套餐
      const latestOrder = await this.orderRepo.findOne({
        where: { userId: user.id, status: 1 },
        order: { paidAt: 'DESC' },
        relations: ['package'],
      })

      if (!latestOrder?.package || latestOrder.package.dailyTopCards <= 0) continue

      // 检查今天是否已有配额
      const exists = await this.quotaRepo.findOne({
        where: { userId: user.id, date: today as any, isDeleted: 0 },
      })
      if (exists) continue

      const quota = this.quotaRepo.create({
        userId: user.id,
        date: today as any,
        totalQuota: latestOrder.package.dailyTopCards,
        usedCount: 0,
        vipPackageId: latestOrder.package.id,
      })
      await this.quotaRepo.save(quota)
      count++
    }

    return count
  }

  // ========================================================================
  //  运营后台手动置顶
  // ========================================================================

  /**
   * 运营手动给用户置顶
   * @param userId 目标用户
   * @param durationHours 置顶时长（小时）
   * @param boostScore 手动加权分（可选）
   */
  async adminPinUser(userId: number, durationHours: number, boostScore?: number) {
    const now = new Date()
    const topEndTime = new Date(now.getTime() + durationHours * 3600_000)

    // 写入置顶记录
    const record = this.topRecordRepo.create({
      userId,
      topStartTime: now,
      topEndTime,
      source: 'manual',
      status: 1,
    })
    await this.topRecordRepo.save(record)

    // 更新 user.pinnedExpireAt
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (user) {
      user.pinnedExpireAt = topEndTime
      if (boostScore !== undefined && boostScore > 0) {
        user.manualBoostScore = boostScore
      }
      await this.userRepo.save(user)
    }

    // 清除缓存
    await this.redis.del(`recommend:score:${userId}`)

    return { success: true, pinnedUntil: topEndTime }
  }
}
