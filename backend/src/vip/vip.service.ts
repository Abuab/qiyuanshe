import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan, DataSource } from 'typeorm'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { VipPackage } from '../entities/VipPackage'
import { UserTopRecord } from '../entities/UserTopRecord'
import { UserTopCardQuota } from '../entities/UserTopCardQuota'
import { UserRedLineQuota } from '../entities/UserRedLineQuota'
import { RedLineUsage } from '../entities/RedLineUsage'
import { SystemConfig } from '../entities/SystemConfig'
import { RedisService } from '../common/redis.service'

export const RED_LINE_TERM_DEFAULT = '红线'

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
    @InjectRepository(UserRedLineQuota)
    private readonly redLineQuotaRepo: Repository<UserRedLineQuota>,
    @InjectRepository(RedLineUsage)
    private readonly redLineUsageRepo: Repository<RedLineUsage>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  // ========================================================================
  //  套餐展示（用户端）
  // ========================================================================

  async listPackages() {
    const packages = await this.packageRepo.find({
      where: { status: 1, isDeleted: 0 },
      order: { sortOrder: 'DESC', id: 'ASC' },
    })
    // TypeORM 可能将 BIGINT/DECIMAL 返回为字符串，前端需要数字类型
    return packages.map(pkg => ({
      ...pkg,
      id: Number(pkg.id),
      price: Number(pkg.price),
    }))
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
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = await queryRunner.manager.findOne(VipOrder, {
        where: { orderNo },
        relations: ['package'],
      })
      if (!order) throw new Error('订单不存在')
      if (order.status === 1) {
        await queryRunner.rollbackTransaction()
        return { success: true, message: '已处理' }
      }

      const pkg = order.package
      if (!pkg) throw new Error('套餐不存在')

      const now = new Date()
      const expireTime = new Date(now.getTime() + pkg.durationDays * 86_400_000)

      // 1. 更新订单
      await queryRunner.manager.update(VipOrder, { orderNo }, {
        status: 1, paidAt: now, expireTime, transactionId: transactionId || '',
      })

      // 2. 激活会员
      const user = await queryRunner.manager.findOne(User, { where: { id: order.userId } })
      if (user) {
        const updateData: Partial<User> = { isVip: 1, vipLevel: Math.max(user.vipLevel || 0, order.vipLevel) }
        if (user.vipExpireTime && user.vipExpireTime > now) {
          updateData.vipExpireTime = new Date(user.vipExpireTime.getTime() + pkg.durationDays * 86_400_000)
        } else {
          updateData.vipExpireTime = expireTime
        }
        await queryRunner.manager.update(User, { id: order.userId }, updateData)
      }

      // 3. 发放今日置顶卡额度（仅当前套餐每日配额生效）
      // 业务规则：每日配额以最新订单的套餐为准，不做叠加
      if (pkg.dailyTopCards > 0) {
        const today = todayStr()
        const existingQuota = await queryRunner.manager.findOne(UserTopCardQuota, {
          where: { userId: order.userId, date: today as any, isDeleted: 0 },
        })
        if (existingQuota) {
          existingQuota.totalQuota += pkg.dailyTopCards
          await queryRunner.manager.save(existingQuota)
        } else {
          const quota = queryRunner.manager.create(UserTopCardQuota, {
            userId: order.userId, date: today as any, totalQuota: pkg.dailyTopCards, usedCount: 0, vipPackageId: pkg.id,
          })
          await queryRunner.manager.save(quota)
        }
      }

      // 4. 发放红线索额度（终身累计，非每日重置）
      // 续费时若已有未用完额度，正确累加新套餐红线索数量
      if (pkg.redLineCount > 0) {
        const existing = await queryRunner.manager.findOne(UserRedLineQuota, {
          where: { userId: order.userId, isDeleted: 0 },
        })
        if (existing) {
          existing.totalQuota += pkg.redLineCount
          await queryRunner.manager.save(existing)
        } else {
          const rl = queryRunner.manager.create(UserRedLineQuota, {
            userId: order.userId, totalQuota: pkg.redLineCount, usedCount: 0, vipPackageId: pkg.id,
          })
          await queryRunner.manager.save(rl)
        }
      }

      await queryRunner.commitTransaction()

      // 清除缓存（事务外，Redis 失败不影响主流程）
      await this.redis.del(`recommend:score:${order.userId}`).catch(() => {})

      return { success: true, orderId: order.id, expireTime }
    } catch (e) {
      await queryRunner.rollbackTransaction()
      throw e
    } finally {
      await queryRunner.release()
    }
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
   * 定时任务：批量降级过期会员
   * 使用单条 UPDATE 语句，不逐条查询和保存，避免性能问题
   * 红线索额度（RedLineQuota）在会员到期后保留不清零 — 续费后可继续使用
   */
  async checkExpiredVip(): Promise<number> {
    const now = new Date()

    // 批量 UPDATE：到期会员降为普通用户
    const result = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ isVip: 0, vipLevel: 0, vipExpireTime: null as any })
      .where('isVip = :vip', { vip: 1 })
      .andWhere('vipExpireTime IS NOT NULL')
      .andWhere('vipExpireTime <= :now', { now })
      .execute()

    const count = result.affected || 0

    if (count > 0) {
      // 结束进行中的置顶记录（不再逐个处理，批量标记过期置顶）
      await this.topRecordRepo
        .createQueryBuilder()
        .update(UserTopRecord)
        .set({ status: 2 })
        .where('status = :active', { active: 1 })
        .andWhere('topEndTime <= :now', { now })
        .execute()

      // 注意：不再清除置顶卡额度 (UserTopCardQuota) — dailyQuotaReset 会每天重新生成
      // 注意：不再清除红线索额度 (UserRedLineQuota) — 会员续费后保留原有额度
      console.log(`[VipService] 已降级 ${count} 名过期会员`)
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
    if (boostScore !== undefined && (boostScore < 0 || boostScore > 1000)) {
      throw new Error('boostScore 超出允许范围（0-1000）')
    }
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

  // ========================================================================
  //  红线索系统
  // ========================================================================

  /** 获取红线索可配置的显示名称（如：红线索、钥匙、心动卡、鹊桥令） */
  async getRedLineTerm(): Promise<string> {
    try {
      const cfg = await this.configRepo.findOne({ where: { configKey: 'red_line_term' } })
      if (cfg?.configValue) return cfg.configValue.trim() || RED_LINE_TERM_DEFAULT
    } catch { /* fallback */ }
    return RED_LINE_TERM_DEFAULT
  }

  /** 管理员设置红线索显示名称 */
  async setRedLineTerm(term: string) {
    let cfg = await this.configRepo.findOne({ where: { configKey: 'red_line_term' } })
    if (!cfg) {
      cfg = this.configRepo.create({ configKey: 'red_line_term', configValue: term })
    } else {
      cfg.configValue = term
    }
    await this.configRepo.save(cfg)
    return { success: true, term }
  }

  /** 查询用户红线索状态 */
  async getRedLineStatus(userId: number) {
    const quota = await this.redLineQuotaRepo.findOne({
      where: { userId, isDeleted: 0 },
    })
    const remaining = quota ? Math.max(0, quota.totalQuota - quota.usedCount) : 0
    const total = quota ? quota.totalQuota : 0
    const used = quota ? quota.usedCount : 0
    const term = await this.getRedLineTerm()

    return { remaining, total, used, term }
  }

  /** 使用红线索解锁目标用户的联系方式 */
  async useRedLine(userId: number, targetUserId: number) {
    // 校验会员有效性
    const now = new Date()
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new Error('用户不存在')
    if (!user.isVip || !user.vipExpireTime || user.vipExpireTime <= now) {
      throw new Error('会员已过期，请先续费')
    }

    // 1. 校验目标用户存在且有联系方式（允许 NORMAL(1) 和 INCOMPLETE(2)）
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId, isDeleted: 0 },
    })
    if (!targetUser) throw new Error('用户不存在或已注销')

    const contact = targetUser.wechat || targetUser.phone
    if (!contact) throw new Error('该用户暂未填写联系方式')

    // 2. 校验是否已经解锁过（同一对用户不重复扣减）
    const already = await this.redLineUsageRepo.findOne({
      where: { userId, targetUserId },
    })
    if (already) {
      return {
        success: true,
        contact,
        note: '您已解锁过该用户的联系方式',
        alreadyUnlocked: true,
      }
    }

    // 3. 校验红线索额度
    const quota = await this.redLineQuotaRepo.findOne({
      where: { userId, isDeleted: 0 },
    })
    if (!quota || quota.usedCount >= quota.totalQuota) {
      const term = await this.getRedLineTerm()
      throw new Error(`${term}已用完，请购买会员获取更多${term}`)
    }

    // 4. 扣除额度
    quota.usedCount += 1
    await this.redLineQuotaRepo.save(quota)

    // 5. 记录使用
    const usage = this.redLineUsageRepo.create({
      userId,
      targetUserId,
      unlockedContact: contact,
      quotaId: quota.id,
    })
    await this.redLineUsageRepo.save(usage)

    return {
      success: true,
      contact,
      remaining: quota.totalQuota - quota.usedCount,
    }
  }

  // ========================================================================
  //  红线索管理员接口
  // ========================================================================

  /** 管理员查看用户的红线索使用记录 */
  async getRedLineUsages(userId: number, page = 1, limit = 20) {
    const [list, total] = await this.redLineUsageRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }

  // ========================================================================
  //  页面配置（从 SystemConfig 读取，失败时返回默认值）
  // ========================================================================

  async getCustomConfig() {
    try {
      const cfg = await this.configRepo.findOne({ where: { configKey: 'vip_custom_page' } })
      if (cfg?.configValue) return JSON.parse(cfg.configValue)
    } catch { /* fallback */ }
    return this.defaultCustomConfig()
  }

  async getAboutConfig() {
    try {
      const cfg = await this.configRepo.findOne({ where: { configKey: 'vip_about_page' } })
      if (cfg?.configValue) return JSON.parse(cfg.configValue)
    } catch { /* fallback */ }
    return this.defaultAboutConfig()
  }

  /** 保存定制会员页配置 */
  async saveCustomConfig(data: any) {
    let cfg = await this.configRepo.findOne({ where: { configKey: 'vip_custom_page' } })
    if (!cfg) {
      cfg = this.configRepo.create({ configKey: 'vip_custom_page', configValue: '' })
    }
    cfg.configValue = JSON.stringify(data)
    await this.configRepo.save(cfg)
    return { success: true }
  }

  /** 保存关于我们页配置 */
  async saveAboutConfig(data: any) {
    let cfg = await this.configRepo.findOne({ where: { configKey: 'vip_about_page' } })
    if (!cfg) {
      cfg = this.configRepo.create({ configKey: 'vip_about_page', configValue: '' })
    }
    cfg.configValue = JSON.stringify(data)
    await this.configRepo.save(cfg)
    return { success: true }
  }

  /** 获取安全征婚提示配置 */
  async getSafetyTipsConfig() {
    try {
      const cfg = await this.configRepo.findOne({ where: { configKey: 'vip_safety_tips' } })
      if (cfg?.configValue) return JSON.parse(cfg.configValue)
    } catch { /* fallback */ }
    return { tips: this.defaultSafetyTips() }
  }

  /** 保存安全征婚提示配置 */
  async saveSafetyTipsConfig(tips: string[]) {
    let cfg = await this.configRepo.findOne({ where: { configKey: 'vip_safety_tips' } })
    if (!cfg) {
      cfg = this.configRepo.create({ configKey: 'vip_safety_tips', configValue: '' })
    }
    cfg.configValue = JSON.stringify({ tips })
    await this.configRepo.save(cfg)
    return { success: true }
  }

  defaultSafetyTips(): string[] {
    return [
      '请认准平台官方客服，谨防冒充人员',
      '首次见面请选择公共场合，确保安全',
      '交往过程中请勿轻易转账、借贷',
      '如遇可疑行为请及时向平台举报',
      '平台将对违规用户进行封禁处理',
    ]
  }

  private defaultCustomConfig() {
    return {
      bannerUrl: '',
      suitableTitle: '哪些人适合1对1定制服务',
      suitableList: [
        { icon: '💼', name: '工作繁忙', desc: '没时间自己筛选', color: '#FFF0F3' },
        { icon: '🎯', name: '目标明确', desc: '想找特定类型', color: '#F0F0FF' },
        { icon: '🔒', name: '注重隐私', desc: '不愿公开信息', color: '#FFF8E1' },
        { icon: '⚡', name: '追求效率', desc: '希望快速脱单', color: '#E8F5E9' },
      ],
      serviceTitle: '专属服务 助你脱单',
      serviceList: [
        { icon: '🎯', name: '精准1对1匹配', desc: '红娘根据您的条件精准筛选推荐', color: '#FFF0F3' },
        { icon: '💌', name: '红娘主动推荐', desc: '专业红娘主动为您匹配合适人选', color: '#F0F0FF' },
        { icon: '👑', name: '开放隐藏会员', desc: '解锁隐藏优质会员资料查看权限', color: '#FFF8E1' },
        { icon: '⭐', name: '优先优质配对', desc: '平台优先推荐优质匹配对象', color: '#E8F5E9' },
        { icon: '💡', name: '情感指导服务', desc: '专业情感顾问一对一指导', color: '#FCE4EC' },
        { icon: '📸', name: '个人形象提升', desc: '专业团队帮您打造最佳形象', color: '#E3F2FD' },
        { icon: '🤝', name: '线下约见服务', desc: '协助安排安全舒适的线下见面', color: '#FFF3E0' },
        { icon: '📊', name: '及时反馈结果', desc: '定期反馈匹配进展和优化建议', color: '#F3E5F5' },
      ],
    }
  }

  private defaultAboutConfig() {
    return {
      bannerUrl: '',
      title: '平台特点',
      features: [
        { icon: '👥', name: '真实海量本地用户', desc: '严格审核机制，确保用户真实可靠', color: '#FFF0F3' },
        { icon: '🤝', name: '靠谱本地服务团队', desc: '专业红娘团队，深耕本地婚恋市场', color: '#F0F0FF' },
        { icon: '💍', name: '匹配资源丰富脱单效率高', desc: '海量优质资源，智能匹配快速脱单', color: '#FFF8E1' },
        { icon: '👑', name: '私人定制专享红娘服务', desc: '一对一专属服务，全程陪伴指导', color: '#E8F5E9' },
      ],
    }
  }
}
