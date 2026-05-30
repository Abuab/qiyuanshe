import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'

export interface PosterTemplateConfig {
  id: number
  name: string
  bgColor: string
  tagColor: string
  layout: 'portrait' | 'landscape'
}

export interface PromotionStats {
  totalShares: number
  totalReferrals: number
  totalRewards: number
  referralRate: number
}

@Injectable()
export class PosterService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  getTemplates(): PosterTemplateConfig[] {
    return [
      {
        id: 1,
        name: '推荐女嘉宾',
        bgColor: 'linear-gradient(135deg, #FFB6C1, #FFC0CB)',
        tagColor: '#FF6B9D',
        layout: 'portrait',
      },
      {
        id: 2,
        name: '推荐男嘉宾',
        bgColor: 'linear-gradient(135deg, #87CEEB, #ADD8E6)',
        tagColor: '#4A90E2',
        layout: 'portrait',
      },
      {
        id: 3,
        name: '甜蜜约会',
        bgColor: 'linear-gradient(135deg, #FFFACD, #FFF8DC)',
        tagColor: '#FFB347',
        layout: 'portrait',
      },
      {
        id: 4,
        name: '缘定今生',
        bgColor: 'linear-gradient(135deg, #DDA0DD, #EE82EE)',
        tagColor: '#722ED1',
        layout: 'portrait',
      },
    ]
  }

  async trackShare(dto: { userId?: number; templateId?: number; scene?: string }): Promise<void> {
    const log = this.auditLogRepository.create({
      action: 'SHARE_POSTER',
      targetType: 'poster',
      targetId: dto.templateId || 0,
      reason: JSON.stringify({
        templateId: dto.templateId,
        scene: dto.scene,
        userId: dto.userId,
      }),
    })

    await this.auditLogRepository.save(log)
  }

  async parseScene(scene: string): Promise<{ referrerId: number; templateId?: number } | null> {
    try {
      const decoded = Buffer.from(scene, 'base64').toString('utf-8')
      const params = new URLSearchParams(decoded)

      const referrerId = parseInt(params.get('r') || '0')
      const templateId = parseInt(params.get('t') || '0')

      if (!referrerId) {
        return null
      }

      return { referrerId, templateId: templateId || undefined }
    } catch {
      return null
    }
  }

  encodeScene(referrerId: number, templateId?: number): string {
    const params = new URLSearchParams()
    params.set('r', referrerId.toString())
    if (templateId) {
      params.set('t', templateId.toString())
    }

    return Buffer.from(params.toString()).toString('base64')
  }

  async getPromotionStats(userId: number): Promise<PromotionStats> {
    const shareLogs = await this.auditLogRepository.count({
      where: {
        action: 'SHARE_POSTER',
      },
    })

    const referralLogs = await this.auditLogRepository.count({
      where: {
        action: 'REFERRAL_REGISTER',
      },
    })

    const vipRewardLogs = await this.auditLogRepository.count({
      where: {
        action: 'VIP_REFERRAL_REWARD',
      },
    })

    return {
      totalShares: shareLogs,
      totalReferrals: referralLogs,
      totalRewards: vipRewardLogs * 10,
      referralRate: shareLogs > 0 ? (referralLogs / shareLogs) * 100 : 0,
    }
  }

  async recordReferral(referrerId: number, referredUserId: number): Promise<void> {
    const log = this.auditLogRepository.create({
      action: 'REFERRAL_REGISTER',
      targetType: 'user',
      targetId: referredUserId,
      reason: JSON.stringify({ referredUserId }),
    })

    await this.auditLogRepository.save(log)
  }

  async recordVipReward(referrerId: number, rewardAmount: number): Promise<void> {
    const log = this.auditLogRepository.create({
      action: 'VIP_REFERRAL_REWARD',
      targetType: 'user',
      targetId: referrerId,
      reason: JSON.stringify({ rewardAmount }),
    })

    await this.auditLogRepository.save(log)
  }

  generatePosterUrl(userId: number, templateId: number): string {
    const scene = this.encodeScene(userId, templateId)
    return `/pages/index/index?scene=${scene}`
  }
}
