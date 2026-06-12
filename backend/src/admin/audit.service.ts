import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'
import { UserPhoto } from '../entities/UserPhoto'
import { User } from '../entities/User'
import { QuestionAnswer } from '../entities/QuestionAnswer'

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
      photo: '照片上传',
      answer: '回答审核',
    }
    return {
      ...audit,
      typeLabel: typeLabels[audit.targetType] || audit.targetType,
      submitter: audit.submitter ? {
        id: audit.submitter.id,
        nickname: audit.submitter.nickname,
        avatar: audit.submitter.avatar,
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
    return this.auditLogRepository.count({ where: { action: 'PENDING' } })
  }

  async approve(id: number, reason?: string) {
    const audit = await this.auditLogRepository.findOne({ where: { id } })
    if (!audit) return

    await this.auditLogRepository.update(id, { action: 'APPROVE', adminNote: reason })

    if (audit.targetType === 'photo' && audit.targetId) {
      await this.userPhotoRepository.update(audit.targetId, { auditStatus: 1 })
    } else if (audit.targetType === 'answer' && audit.targetId) {
      await this.answerRepository.update(audit.targetId, { status: 1 })
    } else if (audit.targetType === 'user' && audit.targetId) {
      // Sync user profile changes from audit content
      await this.applyUserProfileChanges(audit)
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
        selfIntro: 'selfIntro',
        mateRequirement: 'mateRequirement',
      }

      for (const [key, field] of Object.entries(fieldMap)) {
        if (diff[key]) {
          updatedFields[field] = diff[key]
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
    } else if (audit.targetType === 'answer' && audit.targetId) {
      await this.answerRepository.update(audit.targetId, { status: 2 })
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
}
