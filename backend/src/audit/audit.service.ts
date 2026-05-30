import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'
import { UserPhoto } from '../entities/UserPhoto'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { TencentCloudModerationProvider } from './providers/tencent-cloud-moderation.provider'
import {
  AuditPhotoDto,
  AuditTextDto,
  QueryPendingAuditDto,
  ApproveAuditDto,
  RejectAuditDto,
  AuditType,
  AuditStatus,
} from './dto/audit.dto'

export interface PendingAuditItem {
  id: number
  type: AuditType
  targetId: number
  userId: number
  content: string
  extraData?: any
  aiResult: string
  aiSuggestion: string
  createdAt: Date
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly moderationProvider: TencentCloudModerationProvider,
  ) {}

  async auditPhoto(dto: AuditPhotoDto): Promise<{ success: boolean; status: number; message: string }> {
    const { photoId, photoUrl, userId } = dto

    const photo = await this.photoRepository.findOne({
      where: { id: photoId, userId },
    })

    if (!photo) {
      throw new NotFoundException('照片不存在')
    }

    try {
      const result = await this.moderationProvider.moderateImage(photoUrl)

      let auditStatus: number
      let aiResult = 'Normal'
      let aiSuggestion = 'Pass'

      if (result.result === 'pass') {
        auditStatus = AuditStatus.APPROVED
        aiResult = result.evilLabel || 'Normal'
        aiSuggestion = 'Pass'
      } else if (result.result === 'reject') {
        auditStatus = AuditStatus.REJECTED
        aiResult = result.evilLabel || 'Blocked'
        aiSuggestion = 'Block'
      } else {
        auditStatus = AuditStatus.PENDING
        aiResult = result.evilLabel || 'Review'
        aiSuggestion = 'Review'
      }

      await this.photoRepository.update({ id: photoId }, { auditStatus })

      const log = this.auditLogRepository.create({
        action: `PHOTO_${aiSuggestion.toUpperCase()}`,
        targetType: 'photo',
        targetId: photoId,
        reason: JSON.stringify({
          aiResult,
          evilLabel: result.evilLabel,
          evilType: result.evilType,
        }),
      })
      await this.auditLogRepository.save(log)

      return {
        success: true,
        status: auditStatus,
        message: aiSuggestion === 'Block' ? '图片违规，已被拒绝' : aiSuggestion === 'Review' ? '需要人工复核' : '审核通过',
      }
    } catch (error) {
      console.error('Photo audit error:', error)
      throw new BadRequestException('图片审核失败')
    }
  }

  async auditText(dto: AuditTextDto): Promise<{ success: boolean; result: string; keywords: string[] }> {
    const { text, type, targetId, userId } = dto

    try {
      const result = await this.moderationProvider.moderateText(text)

      const log = this.auditLogRepository.create({
        action: `TEXT_${result.result.toUpperCase()}`,
        targetType: type,
        targetId: targetId || 0,
        reason: JSON.stringify({
          aiResult: result.evilLabel,
          keywords: result.keywords,
        }),
      })
      await this.auditLogRepository.save(log)

      return {
        success: true,
        result: result.result,
        keywords: result.keywords,
      }
    } catch (error) {
      console.error('Text audit error:', error)
      throw new BadRequestException('文本审核失败')
    }
  }

  async getPendingAudit(dto: QueryPendingAuditDto): Promise<{ list: PendingAuditItem[]; total: number }> {
    const { type, page = 1, limit = 20 } = dto
    const skip = (page - 1) * limit

    const pendingItems: PendingAuditItem[] = []

    if (!type || type === AuditType.PHOTO) {
      const photos = await this.photoRepository.find({
        where: { auditStatus: AuditStatus.PENDING },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip,
        take: type ? limit : Math.floor(limit / 3),
      })

      for (const photo of photos) {
        pendingItems.push({
          id: photo.id,
          type: AuditType.PHOTO,
          targetId: photo.id,
          userId: photo.userId,
          content: photo.photoUrl,
          extraData: { user: photo.user },
          aiResult: 'Pending Review',
          aiSuggestion: 'Manual Review Required',
          createdAt: photo.createdAt,
        })
      }
    }

    if (!type || type === AuditType.ANSWER) {
      const remainingLimit = type ? limit : limit - pendingItems.length
      if (remainingLimit > 0) {
        const answers = await this.answerRepository.find({
          where: { status: AuditStatus.PENDING },
          relations: ['user', 'question'],
          order: { createdAt: 'DESC' },
          skip: 0,
          take: remainingLimit,
        })

        for (const answer of answers) {
          pendingItems.push({
            id: answer.id,
            type: AuditType.ANSWER,
            targetId: answer.id,
            userId: answer.userId,
            content: answer.content,
            extraData: {
              user: answer.user,
              question: answer.question,
            },
            aiResult: 'Pending Review',
            aiSuggestion: 'Manual Review Required',
            createdAt: answer.createdAt,
          })
        }
      }
    }

    const total = await this.getTotalPendingCount(type)

    return {
      list: pendingItems.slice(0, limit),
      total,
    }
  }

  private async getTotalPendingCount(type?: AuditType): Promise<number> {
    let total = 0

    if (!type || type === AuditType.PHOTO) {
      const photoCount = await this.photoRepository.count({
        where: { auditStatus: AuditStatus.PENDING },
      })
      total += photoCount
    }

    if (!type || type === AuditType.ANSWER) {
      const answerCount = await this.answerRepository.count({
        where: { status: AuditStatus.PENDING },
      })
      total += answerCount
    }

    return total
  }

  async approve(targetType: string, targetId: number, dto: ApproveAuditDto): Promise<{ success: boolean }> {
    const { adminId, reason } = dto

    if (targetType === 'photo') {
      await this.photoRepository.update({ id: targetId }, { auditStatus: AuditStatus.APPROVED })
    } else if (targetType === 'answer') {
      await this.answerRepository.update({ id: targetId }, { status: AuditStatus.APPROVED })
    } else if (targetType === 'user') {
      await this.userRepository.update({ id: targetId }, { status: 1 })
    }

    const log = this.auditLogRepository.create({
      action: `APPROVE_${targetType.toUpperCase()}`,
      targetType,
      targetId,
      adminId,
      reason: reason || '审核通过',
    })
    await this.auditLogRepository.save(log)

    return { success: true }
  }

  async reject(targetType: string, targetId: number, dto: RejectAuditDto): Promise<{ success: boolean }> {
    const { adminId, reason } = dto

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('拒绝原因不能为空')
    }

    if (targetType === 'photo') {
      await this.photoRepository.update({ id: targetId }, { auditStatus: AuditStatus.REJECTED })

      const photo = await this.photoRepository.findOne({ where: { id: targetId } })
      if (photo) {
        await this.sendRejectionNotification(photo.userId, '照片', reason)
      }
    } else if (targetType === 'answer') {
      await this.answerRepository.update({ id: targetId }, { status: AuditStatus.REJECTED })

      const answer = await this.answerRepository.findOne({ where: { id: targetId } })
      if (answer) {
        await this.sendRejectionNotification(answer.userId, '回答', reason)
      }
    } else if (targetType === 'user') {
      await this.userRepository.update({ id: targetId }, { status: 3 })

      await this.sendRejectionNotification(targetId, '用户资料', reason)
    }

    const log = this.auditLogRepository.create({
      action: `REJECT_${targetType.toUpperCase()}`,
      targetType,
      targetId,
      adminId,
      reason,
    })
    await this.auditLogRepository.save(log)

    return { success: true }
  }

  private async sendRejectionNotification(userId: number, itemType: string, reason: string): Promise<void> {
    const log = this.auditLogRepository.create({
      action: 'REJECTION_NOTIFICATION',
      targetType: 'notification',
      targetId: userId,
      reason: JSON.stringify({ itemType, reason }),
    })
    await this.auditLogRepository.save(log)
  }

  async getAuditHistory(
    targetType: string,
    targetId: number,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { targetType, targetId },
      order: { createdAt: 'DESC' },
    })
  }
}
