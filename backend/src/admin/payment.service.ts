import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Raw } from 'typeorm'
import { VipOrder } from '../entities/VipOrder'
import { VipPackage } from '../entities/VipPackage'
import { User } from '../entities/User'

interface OrderFilter {
  page?: number
  limit?: number
  orderNo?: string
  userKeyword?: string
  status?: number
  startDate?: string
  endDate?: string
  timeRange?: string
}

@Injectable()
export class AdminPaymentService {
  constructor(
    @InjectRepository(VipOrder)
    private readonly orderRepository: Repository<VipOrder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(VipPackage)
    private readonly packageRepository: Repository<VipPackage>,
  ) {}

  async orders(filter: OrderFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')

    if (filter.orderNo) {
      queryBuilder.where('order.orderNo LIKE :orderNo', {
        orderNo: `%${filter.orderNo}%`,
      })
    }

    if (filter.userKeyword) {
      queryBuilder.andWhere(
        '(user.nickname LIKE :keyword OR user.phone LIKE :keyword)',
        { keyword: `%${filter.userKeyword}%` },
      )
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('order.status = :status', { status: filter.status })
    }

    if (filter.startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', {
        startDate: filter.startDate,
      })
    }

    if (filter.endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: filter.endDate })
    }

    queryBuilder.orderBy('order.createdAt', 'DESC')

    queryBuilder.skip(skip).take(limit)

    const [orders, total] = await queryBuilder.getManyAndCount()

    const list = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      userId: order.userId,
      vipLevel: order.vipLevel,
      amount: Number(order.amount) / 100 || 0, // 分转元展示
      payType: order.payType,
      status: order.status,
      paidAt: order.paidAt,
      expireTime: order.expireTime,
      createdAt: order.createdAt,
      userNickname: order.user?.nickname || '-',
      userAvatar: order.user?.avatar || '',
      userPhone: order.user?.phone || '',
    }))

    return {
      list,
      page,
      limit,
      total,
    }
  }

  async orderDetail(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'package'],
    })
    if (!order) return null
    return {
      ...order,
      amount: Number(order.amount) / 100, // 分转元展示
    }
  }

  async refund(orderId: number, reason: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId }, relations: ['package'] })
    if (!order) return

    await this.orderRepository.update(orderId, { status: 2 })

    // 退费后扣减用户会员到期时间
    if (order.userId && order.package) {
      const user = await this.userRepository.findOne({ where: { id: order.userId } })
      if (user && user.vipExpireTime) {
        const expireDate = new Date(user.vipExpireTime)
        const durationMs = (order.package.durationDays || 30) * 24 * 60 * 60 * 1000
        const newExpire = new Date(expireDate.getTime() - durationMs)
        const now = new Date()

        if (newExpire <= now) {
          // 到期日已过 → 取消VIP
          await this.userRepository.update(order.userId, {
            isVip: 0,
            vipLevel: 0,
            vipExpireTime: null,
            vipPackageName: '',
          })
        } else {
          await this.userRepository.update(order.userId, {
            vipExpireTime: newExpire,
          })
        }
      }
    }
  }

  async getStats(params: { timeRange?: string; startDate?: string; endDate?: string }) {
    const { timeRange, startDate, endDate } = params
    const now = new Date()
    let dateStart: Date

    switch (timeRange) {
      case 'today':
        dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        if (startDate) {
          dateStart = new Date(startDate)
        } else {
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
    }
    const dateEnd = endDate ? new Date(endDate) : now

    const dateCondition = {
      createdAt: Raw(alias => `${alias} >= :start AND ${alias} <= :end`, {
        start: dateStart,
        end: dateEnd,
      }),
    }

    // 已支付订单
    const paidOrders = await this.orderRepository.find({
      where: { status: 1, ...dateCondition },
    })
    // 已退款订单
    const refundedOrders = await this.orderRepository.find({
      where: { status: 2, ...dateCondition },
    })

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) / 100 // 分转元
    const refundAmount = refundedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) / 100 // 分转元
    const orderCount = paidOrders.length
    const averageAmount = orderCount > 0 ? totalRevenue / orderCount : 0

    // 每日营收明细
    const dailyStatsMap: Record<string, { orderCount: number; revenue: number; refund: number }> = {}
    paidOrders.forEach(o => {
      const date = new Date(o.createdAt).toISOString().split('T')[0]
      if (!dailyStatsMap[date]) dailyStatsMap[date] = { orderCount: 0, revenue: 0, refund: 0 }
      dailyStatsMap[date].orderCount++
      dailyStatsMap[date].revenue += (Number(o.amount) || 0) / 100 // 分转元
    })
    refundedOrders.forEach(o => {
      const date = new Date(o.createdAt).toISOString().split('T')[0]
      if (!dailyStatsMap[date]) dailyStatsMap[date] = { orderCount: 0, revenue: 0, refund: 0 }
      dailyStatsMap[date].refund += (Number(o.amount) || 0) / 100 // 分转元
    })

    const dailyStats = Object.entries(dailyStatsMap)
      .map(([date, data]) => ({ date, ...data, revenue: parseFloat(data.revenue.toFixed(2)), refund: parseFloat(data.refund.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 营收趋势
    const trendData = dailyStats.map(d => ({ date: d.date, revenue: d.revenue }))

    // 支付方式分布
    const paymentMethodMap: Record<string, number> = {}
    paidOrders.forEach(o => {
      const key = o.payType || 'unknown'
      paymentMethodMap[key] = (paymentMethodMap[key] || 0) + 1
    })

    // 套餐销量
    const packageMap: Record<string, number> = {}
    paidOrders.forEach(o => {
      const levelName = ['普通', '黄金', '钻石', '至尊'][o.vipLevel || 0] || '未知'
      packageMap[levelName] = (packageMap[levelName] || 0) + 1
    })
    const packageData = Object.entries(packageMap).map(([name, count]) => ({ name, count }))

    return {
      stats: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        orderCount,
        averageAmount: parseFloat(averageAmount.toFixed(2)),
        refundAmount: parseFloat(refundAmount.toFixed(2)),
      },
      dailyStats,
      trendData,
      paymentMethodData: paymentMethodMap,
      packageData,
    }
  }

  /** 获取指定用户的订单/财务记录 */
  async getUserOrders(userId: number) {
    const orders = await this.orderRepository.find({
      where: { userId, isDeleted: 0 },
      relations: ['user', 'package'],
      order: { createdAt: 'DESC' },
    })

    const list = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      vipLevel: order.vipLevel,
      amount: Number(order.amount) / 100, // 分转元展示
      payType: order.payType,
      status: order.status,
      paidAt: order.paidAt,
      expireTime: order.expireTime,
      createdAt: order.createdAt,
    }))

    // 累计消费统计
    const paidAmount = orders
      .filter(o => o.status === 1)
      .reduce((sum, o) => sum + Number(o.amount), 0) / 100

    return {
      list,
      total: list.length,
      stats: {
        totalPaid: parseFloat(paidAmount.toFixed(2)),
        orderCount: list.length,
        paidCount: orders.filter(o => o.status === 1).length,
      },
    }
  }
}
