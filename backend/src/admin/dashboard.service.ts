import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Raw, Not, Between } from 'typeorm'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { Matchmaker } from '../entities/Matchmaker'
import { AuditLog } from '../entities/AuditLog'
import { HotQuestion } from '../entities/HotQuestion'
import { MatchRecord } from '../entities/MatchRecord'
import { ChatMessage } from '../entities/ChatMessage'
import { Activity } from '../entities/Activity'
import { ActivitySignup } from '../entities/ActivitySignup'
import { SystemConfig } from '../entities/SystemConfig'
import { beijingISO } from '../common/utils/date-utils'

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(VipOrder)
    private readonly orderRepository: Repository<VipOrder>,
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepository: Repository<Matchmaker>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivitySignup)
    private readonly signupRepository: Repository<ActivitySignup>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      todayUsers,
      totalVipUsers,
      totalOrders,
      todayRevenue,
      pendingAudits,
      totalMatchmakers,
      totalQuestions,
      yesterdayUsers,
      yesterdayRevenue,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: 0, id: Not(1) } }),
      this.getTodayNewUsers(),
      this.userRepository.count({ where: { isVip: 1, isDeleted: 0, id: Not(1) } }),
      this.orderRepository.count({ where: { status: 1 } }),
      this.getTodayRevenue(),
      this.auditLogRepository.count({ where: { action: 'PENDING' } }),
      this.matchmakerRepository.count({ where: { isActive: 1 } }),
      this.questionRepository.count({ where: { isActive: 1 } }),
      this.getYesterdayNewUsers(),
      this.getYesterdayRevenue(),
    ])

    const userGrowth = yesterdayUsers > 0 ? ((todayUsers - yesterdayUsers) / yesterdayUsers * 100).toFixed(1) : '0'
    const revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : '0'

    return {
      totalUsers,
      todayNewUsers: todayUsers,
      totalVipUsers,
      totalOrders,
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      pendingAudits,
      totalMatchmakers,
      totalQuestions,
      userGrowth: parseFloat(userGrowth),
      todayGrowth: parseFloat(userGrowth),
      vipUsers: totalVipUsers,
      revenueGrowth: parseFloat(revenueGrowth),
    }
  }

  async getUserTrend(timeRange: string = 'week') {
    const now = new Date()
    let startDate: Date
    let dateFormat: 'hour' | 'day' | 'month' = 'day'

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        dateFormat = 'hour'
        break
      case 'week':
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
        dateFormat = 'day'
        break
      case 'month':
        startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
        dateFormat = 'day'
        break
      case 'year':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        dateFormat = 'month'
        break
      default:
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)
    }

    const users = await this.userRepository.find({
      where: {
        createdAt: Raw(alias => `${alias} >= :startDate`, { startDate }),
        isDeleted: 0,
        id: Not(1),
      },
      select: ['createdAt', 'gender'],
    })

    const result: Record<string, { total: number; male: number; female: number }> = {}

    users.forEach(user => {
      let dateKey: string
      if (dateFormat === 'hour') {
        const d = new Date(user.createdAt)
        dateKey = beijingISO(d).slice(0, 13) + ':00'
      } else if (dateFormat === 'month') {
        const d = new Date(user.createdAt)
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } else {
        dateKey = beijingISO(user.createdAt).split('T')[0]
      }
      if (!result[dateKey]) {
        result[dateKey] = { total: 0, male: 0, female: 0 }
      }
      result[dateKey].total++
      if (user.gender === 1) result[dateKey].male++
      else if (user.gender === 2) result[dateKey].female++
    })

    // Fill in missing dates with zeros
    const filled: { date: string; total: number; male: number; female: number }[] = []
    const cursor = new Date(startDate)

    if (dateFormat === 'hour') {
      const endHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
      while (cursor <= endHour) {
        const key = beijingISO(cursor).slice(0, 13) + ':00'
        filled.push({ date: key, ...(result[key] || { total: 0, male: 0, female: 0 }) })
        cursor.setHours(cursor.getHours() + 1)
      }
    } else if (dateFormat === 'month') {
      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
        filled.push({ date: key, ...(result[key] || { total: 0, male: 0, female: 0 }) })
        cursor.setMonth(cursor.getMonth() + 1)
      }
    } else {
      const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      while (cursor <= endDay) {
        const key = beijingISO(cursor).split('T')[0]
        filled.push({ date: key, ...(result[key] || { total: 0, male: 0, female: 0 }) })
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    return filled
  }

  async getGenderDistribution() {
    const [maleCount, femaleCount, unknownCount] = await Promise.all([
      this.userRepository.count({ where: { gender: 1, isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { gender: 2, isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { gender: 0, isDeleted: 0, id: Not(1) } }),
    ])

    return [
      { name: '男性', value: maleCount },
      { name: '女性', value: femaleCount },
      { name: '未知', value: unknownCount },
    ]
  }

  async getAgeDistribution() {
    const now = new Date()
    const nowYear = now.getFullYear()

    const users = await this.userRepository.find({
      select: ['birthYear'],
      where: { birthYear: Raw(alias => `${alias} IS NOT NULL`), isDeleted: 0, id: Not(1) },
    })

    const ageGroups = {
      '18-25岁': 0,
      '26-35岁': 0,
      '36-45岁': 0,
      '45岁以上': 0,
    }

    users.forEach(user => {
      if (user.birthYear) {
        const age = nowYear - user.birthYear
        if (age >= 18 && age <= 25) ageGroups['18-25岁']++
        else if (age >= 26 && age <= 35) ageGroups['26-35岁']++
        else if (age >= 36 && age <= 45) ageGroups['36-45岁']++
        else if (age > 45) ageGroups['45岁以上']++
      }
    })

    return Object.entries(ageGroups).map(([name, value]) => ({ name, value }))
  }

  async getRevenueTrend(timeRange: string = 'week') {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const orders = await this.orderRepository.find({
      where: {
        status: 1,
        createdAt: Raw(alias => `${alias} >= :startDate`, { startDate }),
      },
      select: ['createdAt', 'amount'],
    })

    const result: Record<string, number> = {}
    let cumulative = 0

    orders.forEach(order => {
      const dateKey = beijingISO(order.createdAt).split('T')[0]
      if (!result[dateKey]) {
        result[dateKey] = 0
      }
      result[dateKey] += (Number(order.amount) || 0) / 100 // 分转元
    })

    return Object.entries(result).map(([date, amount]) => {
      cumulative += Number(amount) || 0
      return {
        date,
        amount: parseFloat((Number(amount) || 0).toFixed(2)),
        cumulative: parseFloat(cumulative.toFixed(2)),
      }
    })
  }

  async getFunnelData() {
    const [totalUsers, completedProfile, vipUsers] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({
        where: { avatar: Raw(alias => `${alias} IS NOT NULL AND ${alias} != ''`), isDeleted: 0, id: Not(1) },
      }),
      this.userRepository.count({ where: { isVip: 1, isDeleted: 0, id: Not(1) } }),
    ])

    return [
      { name: '访问用户', value: totalUsers * 10 },
      { name: '注册用户', value: totalUsers },
      { name: '完善资料', value: completedProfile },
      { name: '开通VIP', value: vipUsers },
    ]
  }

  private async getTodayNewUsers(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.userRepository.count({
      where: {
        createdAt: Raw(alias => `${alias} >= :today`, { today }),
        isDeleted: 0,
        id: Not(1),
      },
    })
  }

  private async getYesterdayNewUsers(): Promise<number> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.userRepository.count({
      where: {
        createdAt: Raw(alias => `${alias} >= :yesterday AND ${alias} < :today`, { yesterday, today }),
        isDeleted: 0,
        id: Not(1),
      },
    })
  }

  private async getTodayRevenue(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await this.orderRepository.find({
      where: {
        status: 1,
        createdAt: Raw(alias => `${alias} >= :today`, { today }),
      },
    })

    return orders.reduce((sum, order) => sum + ((Number(order.amount) || 0) / 100), 0) // 分转元
  }

  private async getYesterdayRevenue(): Promise<number> {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await this.orderRepository.find({
      where: {
        status: 1,
        createdAt: Raw(alias => `${alias} >= :yesterday AND ${alias} < :today`, { yesterday, today }),
      },
    })

    return orders.reduce((sum, order) => sum + ((Number(order.amount) || 0) / 100), 0) // 分转元
  }

  // ===== 匹配效果统计 =====

  async getMatchStats(timeRange: string = 'week') {
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); startDate.setHours(0, 0, 0, 0); break
      case 'month': startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); startDate.setHours(0, 0, 0, 0); break
      case 'year': startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); break
      default: startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); startDate.setHours(0, 0, 0, 0)
    }

    const records = await this.matchRecordRepository.find({
      where: { createdAt: Raw(alias => `${alias} >= :startDate`, { startDate }) },
      select: ['status', 'matchmakerId', 'createdAt'],
    })

    const total = records.length
    const success = records.filter(r => r.status === 'success').length
    const inProgress = records.filter(r => r.status === 'in_progress').length
    const failed = records.filter(r => r.status === 'failed').length
    const pending = records.filter(r => r.status === 'pending').length

    // 按红娘分组
    const byMatchmaker: Record<number, { total: number; success: number }> = {}
    records.forEach(r => {
      if (r.matchmakerId) {
        if (!byMatchmaker[r.matchmakerId]) byMatchmaker[r.matchmakerId] = { total: 0, success: 0 }
        byMatchmaker[r.matchmakerId].total++
        if (r.status === 'success') byMatchmaker[r.matchmakerId].success++
      }
    })

    // 每日趋势
    const dailyMap: Record<string, { total: number; success: number }> = {}
    records.forEach(r => {
      const key = beijingISO(r.createdAt).split('T')[0]
      if (!dailyMap[key]) dailyMap[key] = { total: 0, success: 0 }
      dailyMap[key].total++
      if (r.status === 'success') dailyMap[key].success++
    })

    const dailyTrend = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      total: d.total,
      success: d.success,
      rate: d.total > 0 ? parseFloat(((d.success / d.total) * 100).toFixed(1)) : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))

    return {
      total,
      success,
      inProgress,
      failed,
      pending,
      successRate: total > 0 ? parseFloat(((success / total) * 100).toFixed(1)) : 0,
      byMatchmaker: await this.enrichMatchmakerNames(byMatchmaker),
      dailyTrend,
    }
  }

  private async enrichMatchmakerNames(data: Record<number, { total: number; success: number }>) {
    const ids = Object.keys(data).map(Number)
    if (ids.length === 0) return []
    const matchmakers = await this.matchmakerRepository.find({ where: ids.map(id => ({ id })) })
    const nameMap = new Map(matchmakers.map(m => [m.id, m.name || `红娘${m.id}`]))
    return Object.entries(data).map(([id, d]) => ({
      matchmakerId: Number(id),
      name: nameMap.get(Number(id)) || `红娘${id}`,
      total: d.total,
      success: d.success,
      rate: d.total > 0 ? parseFloat(((d.success / d.total) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.total - a.total)
  }

  // ===== 男女比健康度检查 =====

  async getGenderHealth() {
    const [maleCount, femaleCount] = await Promise.all([
      this.userRepository.count({ where: { gender: 1, isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { gender: 2, isDeleted: 0, id: Not(1) } }),
    ])

    const total = maleCount + femaleCount
    const maleRatio = total > 0 ? parseFloat(((maleCount / total) * 100).toFixed(1)) : 0
    const femaleRatio = total > 0 ? parseFloat(((femaleCount / total) * 100).toFixed(1)) : 0

    // 健康等级：从系统配置读阈值（默认 warningThreshold=60, criticalThreshold=70）
    const [warningCfg, criticalCfg] = await Promise.all([
      this.systemConfigRepository.findOne({ where: { configKey: 'health.warningThreshold' } }),
      this.systemConfigRepository.findOne({ where: { configKey: 'health.criticalThreshold' } }),
    ])
    const warningThreshold = warningCfg ? parseFloat(warningCfg.configValue) : 60
    const criticalThreshold = criticalCfg ? parseFloat(criticalCfg.configValue) : 70
    let level: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (maleRatio >= criticalThreshold) level = 'critical'
    else if (maleRatio >= warningThreshold) level = 'warning'

    // 各年龄段男女比
    const nowYear = new Date().getFullYear()
    const users = await this.userRepository.find({
      select: ['birthYear', 'gender'],
      where: { birthYear: Raw(alias => `${alias} IS NOT NULL AND ${alias} > 0`), isDeleted: 0, id: Not(1) },
    })

    const ageGroups: Record<string, { male: number; female: number }> = {
      '18-25': { male: 0, female: 0 },
      '26-35': { male: 0, female: 0 },
      '36-45': { male: 0, female: 0 },
      '45+': { male: 0, female: 0 },
    }

    users.forEach(u => {
      const age = nowYear - u.birthYear
      let group = '45+'
      if (age <= 25) group = '18-25'
      else if (age <= 35) group = '26-35'
      else if (age <= 45) group = '36-45'
      if (u.gender === 1) ageGroups[group].male++
      else if (u.gender === 2) ageGroups[group].female++
    })

    const byAge = Object.entries(ageGroups).map(([group, { male, female }]) => {
      const groupTotal = male + female
      return {
        group,
        male,
        female,
        ratio: groupTotal > 0 ? parseFloat(((male / groupTotal) * 100).toFixed(1)) : 0,
      }
    })

    return {
      total,
      maleCount,
      femaleCount,
      maleRatio,
      femaleRatio,
      level,
      levelLabel: level === 'critical' ? '严重失衡' : level === 'warning' ? '需关注' : '健康',
      byAge,
    }
  }

  // ===== 用户活跃漏斗（DAU/WAU/MAU + 留存） =====

  async getActiveUserFunnel() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

    const [dau, wau, mau, totalUsers, todayNew, profileComplete, vipCount, yesterdayDau] = await Promise.all([
      this.userRepository.count({ where: { lastActiveAt: Raw(alias => `${alias} >= :today`, { today: todayStart }), isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { lastActiveAt: Raw(alias => `${alias} >= :week`, { week: weekAgo }), isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { lastActiveAt: Raw(alias => `${alias} >= :month`, { month: monthAgo }), isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { createdAt: Raw(alias => `${alias} >= :today`, { today: todayStart }), isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { avatar: Raw(alias => `${alias} IS NOT NULL AND ${alias} != ''`), isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { isVip: 1, isDeleted: 0, id: Not(1) } }),
      this.userRepository.count({ where: { lastActiveAt: Raw(alias => `${alias} >= :yesterday AND ${alias} < :today`, { yesterday, today: todayStart }), isDeleted: 0, id: Not(1) } }),
    ])

    // 留存率：DAU 中昨天也活跃的比例
    const dauRetention = yesterdayDau > 0 ? parseFloat(((dau / yesterdayDau) * 100).toFixed(1)) : 0

    // 今日消息量
    const todayMessages = await this.chatMessageRepository.count({
      where: { createdAt: Raw(alias => `${alias} >= :today`, { today: todayStart }) },
    })

    return {
      dau,
      wau,
      mau,
      dauRetention,
      todayMessages,
      funnel: [
        { name: '注册用户', value: totalUsers },
        { name: '月活跃(MAU)', value: mau, pct: totalUsers > 0 ? parseFloat(((mau / totalUsers) * 100).toFixed(1)) : 0 },
        { name: '周活跃(WAU)', value: wau, pct: totalUsers > 0 ? parseFloat(((wau / totalUsers) * 100).toFixed(1)) : 0 },
        { name: '日活跃(DAU)', value: dau, pct: totalUsers > 0 ? parseFloat(((dau / totalUsers) * 100).toFixed(1)) : 0 },
        { name: '完善资料', value: profileComplete, pct: totalUsers > 0 ? parseFloat(((profileComplete / totalUsers) * 100).toFixed(1)) : 0 },
        { name: '开通VIP', value: vipCount, pct: totalUsers > 0 ? parseFloat(((vipCount / totalUsers) * 100).toFixed(1)) : 0 },
      ],
    }
  }

  // ===== 活动效果分析 =====

  async getActivityAnalytics(timeRange: string = 'month') {
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const activities = await this.activityRepository.find({
      where: { createdAt: Raw(alias => `${alias} >= :startDate`, { startDate }) },
      select: ['id', 'title', 'maxParticipants', 'currentParticipants', 'status', 'activityType', 'createdAt'],
    })

    const activityIds = activities.map(a => a.id)
    const signups = activityIds.length > 0
      ? await this.signupRepository.find({ where: { activityId: Raw(alias => `${alias} IN (${activityIds.join(',')})`) }, select: ['activityId', 'status'] })
      : []

    const signupMap = new Map<number, { total: number; confirmed: number }>()
    signups.forEach(s => {
      if (!signupMap.has(s.activityId)) signupMap.set(s.activityId, { total: 0, confirmed: 0 })
      const entry = signupMap.get(s.activityId)!
      entry.total++
      if (s.status === 1) entry.confirmed++
    })

    const list = activities.map(a => {
      const s = signupMap.get(a.id) || { total: 0, confirmed: 0 }
      return {
        id: a.id,
        title: a.title,
        type: a.activityType,
        status: a.status,
        maxParticipants: a.maxParticipants,
        currentParticipants: a.currentParticipants,
        signupTotal: s.total,
        signupConfirmed: s.confirmed,
        fillRate: a.maxParticipants > 0 ? parseFloat(((a.currentParticipants / a.maxParticipants) * 100).toFixed(1)) : 0,
        confirmRate: s.total > 0 ? parseFloat(((s.confirmed / s.total) * 100).toFixed(1)) : 0,
      }
    })

    const totalActivities = activities.length
    const ongoingCount = activities.filter(a => a.status === 1).length
    const totalSignups = list.reduce((sum, a) => sum + a.signupTotal, 0)
    const avgFillRate = totalActivities > 0 ? parseFloat((list.reduce((sum, a) => sum + a.fillRate, 0) / totalActivities).toFixed(1)) : 0

    return {
      summary: {
        totalActivities,
        ongoingCount,
        totalSignups,
        avgFillRate,
        endedCount: activities.filter(a => a.status === 2).length,
      },
      list: list.sort((a, b) => b.signupTotal - a.signupTotal),
    }
  }
}
