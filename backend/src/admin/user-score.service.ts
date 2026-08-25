import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Raw, Not, LessThan } from 'typeorm'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { ChatMessage } from '../entities/ChatMessage'
import { Follow } from '../entities/Follow'
import { UserAuth } from '../entities/UserAuth'

@Injectable()
export class UserScoreService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(VipOrder)
    private readonly orderRepository: Repository<VipOrder>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(UserAuth)
    private readonly authRepository: Repository<UserAuth>,
  ) {}

  /** 计算单个用户评分（0-100） */
  async calculateScore(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId, isDeleted: 0 } })
    if (!user) return 0

    let score = 0

    // 1. 资料完善度 (0-30)
    if (user.avatar && user.avatar.length > 0) score += 5
    if (user.nickname) score += 3
    if (user.gender && user.gender > 0) score += 3
    if (user.birthYear && user.birthYear > 1900) score += 3
    if (user.height && user.height > 0) score += 2
    if (user.education) score += 3
    if (user.occupation) score += 3
    if (user.incomeRange) score += 2
    if (user.hometown) score += 2
    if (user.residence) score += 2
    if (user.mateRequirement && user.mateRequirement.length > 10) score += 2

    // 2. VIP 状态 (0-15)
    if (user.isVip) {
      score += 15
    }

    // 3. 认证数量 (0-20)
    if (user.isRealName) score += 8
    if (user.eidCertStatus === 1) score += 12

    // 4. 活跃度 (0-15)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (user.lastActiveAt && user.lastActiveAt >= thirtyDaysAgo) {
      score += 10
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      if (user.lastActiveAt >= sevenDaysAgo) score += 5
    }

    // 5. 互动量 (0-10)
    const [sentCount, followerCount] = await Promise.all([
      this.chatMessageRepository.count({
        where: { fromUserId: userId, createdAt: Raw(alias => `${alias} >= :date`, { date: thirtyDaysAgo }) },
      }),
      this.followRepository.count({
        where: { targetUserId: userId },
      }),
    ])

    score += Math.min(sentCount, 5)  // 最多5分
    score += Math.min(Math.floor(followerCount / 2), 5)  // 每2个粉丝+1分，最多5分

    const finalScore = Math.min(score, 100)
    return finalScore
  }

  /** 批量更新所有用户评分 */
  async batchUpdateScores(): Promise<number> {
    const users = await this.userRepository.find({
      where: { isDeleted: 0, id: Not(1) },
      select: ['id'],
    })

    let updated = 0
    for (const user of users) {
      try {
        const score = await this.calculateScore(user.id)
        await this.userRepository.update(user.id, { profileScore: score })
        updated++
      } catch {
        // 跳过评分失败的用户
      }
    }
    return updated
  }

  /** 获取流失风险用户列表 */
  async getChurnRiskUsers(days: number = 14, limit: number = 50): Promise<User[]> {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - days)

    return this.userRepository.find({
      where: {
        isDeleted: 0,
        id: Not(1),
        lastActiveAt: LessThan(threshold),
      },
      order: { lastActiveAt: 'ASC' },
      take: limit,
      select: ['id', 'nickname', 'avatar', 'gender', 'lastActiveAt', 'profileScore', 'createdAt'],
    })
  }

  /** 用户分层层级 */
  getUserTier(score: number): string {
    if (score >= 70) return '高价值'
    if (score >= 45) return '潜力'
    if (score >= 20) return '普通'
    return '流失预警'
  }

  /** 用户分层统计 */
  async getScoreDistribution(): Promise<Record<string, number>> {
    const users = await this.userRepository.find({
      where: { isDeleted: 0, id: Not(1) },
      select: ['profileScore'],
    })

    return {
      '高价值(≥70)': users.filter(u => (u.profileScore || 0) >= 70).length,
      '潜力(45-69)': users.filter(u => (u.profileScore || 0) >= 45 && (u.profileScore || 0) < 70).length,
      '普通(20-44)': users.filter(u => (u.profileScore || 0) >= 20 && (u.profileScore || 0) < 45).length,
      '流失预警(<20)': users.filter(u => (u.profileScore || 0) < 20).length,
    }
  }
}
