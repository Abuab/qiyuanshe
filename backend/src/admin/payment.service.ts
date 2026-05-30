import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { VipOrder } from '../entities/VipOrder'
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

    return {
      list: orders,
      page,
      limit,
      total,
    }
  }

  async orderDetail(id: number) {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['user'],
    })
  }

  async refund(orderId: number, reason: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } })
    if (!order) return

    await this.orderRepository.update(orderId, { status: 2 })
  }

  async getStats(params: { timeRange?: string; startDate?: string; endDate?: string }) {
    const { timeRange, startDate, endDate } = params

    let dateCondition: any = {}
    if (timeRange === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dateCondition = MoreThanOrEqual(today)
    } else if (timeRange === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      dateCondition = MoreThanOrEqual(weekAgo)
    } else if (timeRange === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      dateCondition = MoreThanOrEqual(monthAgo)
    } else if (startDate && endDate) {
      dateCondition = Between(startDate, endDate)
    }

    const whereCondition: any = { status: 1 }
    if (dateCondition) {
      whereCondition.createdAt = dateCondition
    }

    const paidOrders = await this.orderRepository.find({ where: whereCondition })
    const refundedOrders = await this.orderRepository.find({
      where: { status: 2, ...(dateCondition ? { createdAt: dateCondition } : {}) },
    })

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0)
    const refundAmount = refundedOrders.reduce((sum, order) => sum + order.amount, 0)
    const orderCount = paidOrders.length
    const averageAmount = orderCount > 0 ? totalRevenue / orderCount : 0

    return {
      stats: {
        totalRevenue,
        orderCount,
        averageAmount,
        refundAmount,
      },
      dailyStats: [],
      trendData: [],
      paymentMethodData: {},
      packageData: [],
    }
  }
}
