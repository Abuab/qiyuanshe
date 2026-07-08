import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'
import { UserPhoto } from '../entities/UserPhoto'
import { User } from '../entities/User'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { normalizeImageUrl } from '../common/image-url'
import { CirclePost } from '../entities/CirclePost'
import { UserAuth } from '../entities/UserAuth'

interface AuditFilter {
  page?: number
  limit?: number
  type?: string
  status?: number
  startDate?: string
  endDate?: string
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(CirclePost)
    private readonly circlePostRepository: Repository<CirclePost>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
  ) {}

  async list(filter: AuditFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.submitter', 'submitter')

    if (filter.type) {
      queryBuilder.where('audit.targetType = :type', { type: filter.type })
    }

    if (filter.status !== undefined) {
      const s = Number(filter.status)
      const action = s === 0 ? 'PENDING' : s === 1 ? 'APPROVE' : 'REJECT'
      queryBuilder.andWhere('audit.action LIKE :action', { action: `%${action}%` })
    }

    if (filter.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', {
        startDate: filter.startDate,
      })
    }

    if (filter.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filter.endDate })
    }

    queryBuilder.orderBy('audit.createdAt', 'DESC')

    queryBuilder.skip(skip).take(limit)

    const [items, total] = await queryBuilder.getManyAndCount()

    return {
      list: items.map(item => this.transformToResponse(item)),
      page,
      limit,
      total,
    }
  }

  private transformToResponse(audit: AuditLog) {
    const typeLabels: Record<string, string> = {
      user: '资料修改',
      user_create: '用户创建',
      photo: '照片上传',
      answer: '回答审核',
      voice: '语音介绍',
    }
    return {
      ...audit,
      typeLabel: typeLabels[audit.targetType] || audit.targetType,
      submitter: audit.submitter ? {
        id: audit.submitter.id,
        nickname: audit.submitter.nickname,
        avatar: normalizeImageUrl(audit.submitter.avatar),
      } : null,
      // Parse before/after from content if it's JSON
      beforeAfter: this.parseContentDiff(audit.content),
    }
  }

  private parseContentDiff(content?: string) {
    if (!content) return null
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async getPendingCount() {
    const [profileCount, circlePostCount, educationCount] = await Promise.all([
      this.auditLogRepository.count({ where: { action: 'PENDING' } }),
      this.circlePostRepository.count({ where: { status: 0 } }),
      this.userAuthRepository.count({ where: { authType: 'education', status: 0 } }),
    ])
    // 学历认证归入「审核管理」，与资料审核一起计入侧边栏 profile 徽标
    const profileTotal = profileCount + educationCount
    return {
      profile: profileTotal,
      education: educationCount,
      circlePost: circlePostCount,
      total: profileTotal + circlePostCount,
    }
  }

  async approve(id: number, reason?: string) {
    const audit = await this.auditLogRepository.findOne({ where: { id } })
    if (!audit) return

    await this.auditLogRepository.update(id, { action: 'APPROVE', adminNote: reason })

    if (audit.targetType === 'photo' && audit.targetId) {
      await this.userPhotoRepository.update(audit.targetId, { auditStatus: 1 })
    } else if (audit.targetType === 'avatar' && audit.targetId) {
      // 头像审核通过：从 content 中解析 url 并更新到 user.avatar，同时清除待审核状态
      try {
        const data = JSON.parse(audit.content || '{}')
        const updates: Record<string, any> = { avatarReviewStatus: 1 }
        if (data.url) {
          updates.avatar = data.url
        }
        await this.userRepository.update(audit.targetId, updates)
      } catch { /* content 非 JSON 时跳过 */ }
    } else if (audit.targetType === 'answer' && audit.targetId) {
      await this.answerRepository.update(audit.targetId, { status: 1 })
    } else if (audit.targetType === 'user' && audit.targetId) {
      // Sync user profile changes from audit content
      await this.applyUserProfileChanges(audit)
    } else if (audit.targetType === 'user_create' && audit.targetId) {
      // 管理员创建用户审核通过 → 用户状态设为正常
      await this.userRepository.update(audit.targetId, { status: 1 })
    } else if (audit.targetType === 'voice' && audit.targetId) {
      await this.userRepository.update(audit.targetId, { voiceAuditStatus: 1 })
    }
  }

  private async applyUserProfileChanges(audit: AuditLog) {
    if (!audit.content) return

    try {
      const diff = JSON.parse(audit.content)
      const updatedFields: any = {}

      const fieldMap: Record<string, string> = {
        nickname: 'nickname',
        avatar: 'avatar',
        gender: 'gender',
        birthYear: 'birthYear',
        height: 'height',
        weight: 'weight',
        education: 'education',
        occupation: 'occupation',
        incomeRange: 'incomeRange',
        housingStatus: 'housingStatus',
        carStatus: 'carStatus',
        maritalStatus: 'maritalStatus',
        hometown: 'hometown',
        residence: 'residence',
        mateRequirement: 'mateRequirement',
        onlyChild: 'onlyChild',
        whenMarry: 'whenMarry',
        zodiac: 'zodiac',
        constellation: 'constellation',
        partnerAgeRange: 'partnerAgeRange',
        partnerHeightMin: 'partnerHeightMin',
        partnerEducation: 'partnerEducation',
        partnerIncome: 'partnerIncome',
        housingRequirement: 'housingRequirement',
        partnerMaritalStatus: 'partnerMaritalStatus',
        acceptChildren: 'acceptChildren',
        personalityTags: 'personalityTags',
        hopeTaTags: 'hopeTaTags',
      }

      for (const [key, field] of Object.entries(fieldMap)) {
        if (diff[key] !== undefined) {
          // personalityTags / hopeTaTags: 逗号分隔字符串 → 数组
          if ((field === 'personalityTags' || field === 'hopeTaTags') && typeof diff[key] === 'string') {
            updatedFields[field] = diff[key].split(',').map((s: string) => s.trim()).filter(Boolean)
          } else {
            updatedFields[field] = diff[key]
          }
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await this.userRepository.update(audit.targetId, updatedFields)
      }
    } catch {
      // If content is not valid JSON, skip user profile update
    }
  }

  async reject(id: number, reason: string) {
    const audit = await this.auditLogRepository.findOne({ where: { id } })
    if (!audit) return

    await this.auditLogRepository.update(id, { action: 'REJECT', reason })

    if (audit.targetType === 'photo' && audit.targetId) {
      await this.userPhotoRepository.update(audit.targetId, { auditStatus: 2 })
    } else if (audit.targetType === 'avatar' && audit.targetId) {
      // 头像审核拒绝：标记为已拒绝状态
      await this.userRepository.update(audit.targetId, { avatarReviewStatus: 2 })
    } else if (audit.targetType === 'answer' && audit.targetId) {
      await this.answerRepository.update(audit.targetId, { status: 2 })
    } else if (audit.targetType === 'user_create' && audit.targetId) {
      // 管理员创建用户审核拒绝 → 用户状态设为禁用
      await this.userRepository.update(audit.targetId, { status: 0 })
    } else if (audit.targetType === 'voice' && audit.targetId) {
      await this.userRepository.update(audit.targetId, { voiceAuditStatus: 2 })
    }
  }

  async batchApprove(ids: number[]) {
    for (const id of ids) {
      await this.approve(id)
    }
  }

  async batchReject(ids: number[], reason: string) {
    for (const id of ids) {
      await this.reject(id, reason)
    }
  }

  async getHistory(type: string, targetId: number) {
    return this.auditLogRepository.find({
      where: { targetType: type, targetId },
      relations: ['submitter'],
      order: { createdAt: 'DESC' },
    })
  }

  async getById(id: number) {
    return this.auditLogRepository.findOne({ where: { id } })
  }

  async getPhotoInfo(photoId: number) {
    const photo = await this.userPhotoRepository.findOne({
      where: { id: photoId },
      relations: ['user'],
    })
    if (!photo) return null
    return { userId: photo.userId, nickname: (photo as any).user?.nickname || '' }
  }

  async getUserInfo(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) return null
    return { nickname: user.nickname || '' }
  }

  async voiceAudit(userId: number, status: number, remark?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user || !user.voiceUrl) throw new Error('用户无语音记录')

    const action = status === 1 ? 'APPROVE' : 'REJECT'

    // 查找已有的 PENDING 审核记录（用户在保存语音时自动创建），找到则更新为最终状态
    const pendingLog = await this.auditLogRepository.findOne({
      where: { targetType: 'voice', targetId: userId, action: 'PENDING' },
      order: { createdAt: 'DESC' },
    })

    if (pendingLog) {
      await this.auditLogRepository.update(pendingLog.id, { action, reason: remark || null })
    } else {
      // 兜底：没有 PENDING 记录时创建一个新的审核日志
      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          targetType: 'voice',
          targetId: userId,
          action,
          reason: remark || null,
          content: JSON.stringify({ voiceUrl: user.voiceUrl, duration: user.voiceDuration }),
        }),
      )
    }

    // 更新用户语音审核状态
    await this.userRepository.update(userId, { voiceAuditStatus: status })
  }
}
