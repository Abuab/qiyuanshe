import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'
import { UserPhoto } from '../entities/UserPhoto'
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
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
  ) {}

  async list(filter: AuditFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')

    if (filter.type) {
      queryBuilder.where('audit.targetType = :type', { type: filter.type })
    }

    if (filter.status !== undefined) {
      const action = filter.status === 0 ? 'PENDING' : filter.status === 1 ? 'APPROVE' : 'REJECT'
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
      list: items,
      page,
      limit,
      total,
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
    }
  }

  async reject(id: number, reason: string) {
    await this.auditLogRepository.update(id, { action: 'REJECT', reason })
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
      order: { createdAt: 'DESC' },
    })
  }
}
