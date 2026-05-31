import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Raw } from 'typeorm'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { Matchmaker } from '../entities/Matchmaker'
import { AuditLog } from '../entities/AuditLog'
import { HotQuestion } from '../entities/HotQuestion'

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
      this.userRepository.count(),
      this.getTodayNewUsers(),
      this.userRepository.count({ where: { isVip: 1 } }),
      this.orderRepository.count(),
      this.getTodayRevenue(),
      this.auditLogRepository.count(),
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

    const users = await this.userRepository.find({
      where: {
        createdAt: Raw(alias => `${alias} >= :startDate`, { startDate }),
      },
      select: ['createdAt', 'gender'],
    })

    const result: Record<string, { total: number; male: number; female: number }> = {}

    users.forEach(user => {
      const dateKey = user.createdAt.toISOString().split('T')[0]
      if (!result[dateKey]) {
        result[dateKey] = { total: 0, male: 0, female: 0 }
      }
      result[dateKey].total++
      if (user.gender === 1) result[dateKey].male++
      else if (user.gender === 2) result[dateKey].female++
    })

    return Object.entries(result).map(([date, data]) => ({
      date,
      ...data,
    }))
  }

  async getGenderDistribution() {
    const [maleCount, femaleCount, unknownCount] = await Promise.all([
      this.userRepository.count({ where: { gender: 1 } }),
      this.userRepository.count({ where: { gender: 2 } }),
      this.userRepository.count({ where: { gender: 0 } }),
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
      where: { birthYear: Raw(alias => `${alias} IS NOT NULL`) },
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
      const dateKey = order.createdAt.toISOString().split('T')[0]
      if (!result[dateKey]) {
        result[dateKey] = 0
      }
      result[dateKey] += order.amount
    })

    return Object.entries(result).map(([date, amount]) => {
      cumulative += amount
      return {
        date,
        amount: parseFloat(amount.toFixed(2)),
        cumulative: parseFloat(cumulative.toFixed(2)),
      }
    })
  }

  async getFunnelData() {
    const [totalUsers, completedProfile, vipUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { avatar: Raw(alias => `${alias} IS NOT NULL AND ${alias} != ''`) } }),
      this.userRepository.count({ where: { isVip: 1 } }),
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

    return orders.reduce((sum, order) => sum + order.amount, 0)
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

    return orders.reduce((sum, order) => sum + order.amount, 0)
  }
}
