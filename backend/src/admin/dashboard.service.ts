import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
    ] = await Promise.all([
      this.userRepository.count(),
      this.getTodayNewUsers(),
      this.userRepository.count({ where: { isVip: 1 } }),
      this.orderRepository.count(),
      this.getTodayRevenue(),
      this.auditLogRepository.count(),
      this.matchmakerRepository.count({ where: { isActive: 1 } }),
      this.questionRepository.count({ where: { isActive: 1 } }),
    ])

    return {
      totalUsers,
      todayUsers,
      totalVipUsers,
      totalOrders,
      todayRevenue,
      pendingAudits,
      totalMatchmakers,
      totalQuestions,
      userGrowth: 0,
      revenueGrowth: 0,
    }
  }

  private async getTodayNewUsers(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.userRepository.count({
      where: {
        createdAt: today as any,
      },
    })
  }

  private async getTodayRevenue(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await this.orderRepository.find({
      where: {
        status: 1,
        createdAt: today as any,
      },
    })

    return orders.reduce((sum, order) => sum + order.amount, 0)
  }
}
