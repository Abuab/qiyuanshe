import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { AuditLog } from '../entities/AuditLog'
import { UserPhoto } from '../entities/UserPhoto'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { NotifyLog } from '../entities/NotifyLog'
import { TencentCloudModerationProvider } from './providers/tencent-cloud-moderation.provider'
import { SystemService } from '../system/system.service'
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
    @InjectRepository(NotifyLog)
    private readonly notifyLogRepository: Repository<NotifyLog>,
    private readonly moderationProvider: TencentCloudModerationProvider,
    @Optional()
    private readonly systemService?: SystemService,
  ) {}

  /**
   * Webhook 通知：向已配置的通道（企业微信/飞书/钉钉）发送审核通知
   */
  async notifyWebhook(type: string, data: any): Promise<void> {
    try {
      // 读取通知总开关
      const notificationEnabled = await this.getConfigValue('notification.enabled')
      if (notificationEnabled !== '1' && notificationEnabled !== 'true') return

      // 读取通知类型配置，检查当前 type 是否启用
      const typesJson = await this.getConfigValue('notification.types')
      let typeConfig: Record<string, boolean> = {}
      try { typeConfig = JSON.parse(typesJson || '{}') } catch {}
      // 未配置时默认启用所有类型
      if (typesJson && typeConfig[type] === false) return

      // 读取通道配置
      const channelsJson = await this.getConfigValue('notification.channels')
      let channels: Record<string, string> = {}
      try { channels = JSON.parse(channelsJson || '{}') } catch {}

      const timestamp = data.time
        ? (typeof data.time === 'string' ? new Date(data.time).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN'))
        : new Date().toLocaleString('zh-CN')
      const userLabel = data.userNickname || data.userId || '未知'
      const contentText = data.content || data.photoUrl || ''

      const typeLabelMap: Record<string, string> = {
        avatar_upload: '头像上传',
        photo_upload: '照片上传',
        chat_message: '聊天消息',
        question_answer: '问答答案',
        report: '用户举报',
      }
      const typeLabel = typeLabelMap[type] || type

      // 企业微信
      if (channels.wechatWork) {
        this.sendWechatWorkWebhook(channels.wechatWork, typeLabel, userLabel, contentText, timestamp, data).catch(() => {})
      }
      // 飞书
      if (channels.feishu) {
        this.sendFeishuWebhook(channels.feishu, typeLabel, userLabel, contentText, timestamp, data).catch(() => {})
      }
      // 钉钉
      if (channels.dingtalk) {
        this.sendDingtalkWebhook(channels.dingtalk, typeLabel, userLabel, contentText, timestamp, data).catch(() => {})
      }
    } catch {
      // webhook 通知失败不影响主流程
    }
  }

  /** 企业微信 webhook */
  private async sendWechatWorkWebhook(webhookUrl: string, typeLabel: string, userLabel: string, content: string, timestamp: string, data: any) {
    const markdownContent = `【审核通知】\n>类型：${typeLabel}\n>用户：${userLabel}\n>内容：${content.length > 200 ? content.substring(0, 200) + '...' : content}\n>时间：${timestamp}\n>[去处理](${process.env.ADMIN_URL || ''})`
    await this.postWebhook(webhookUrl, {
      msgtype: 'markdown',
      markdown: { content: markdownContent },
    }, 'wecom', data)
  }

  /** 飞书 webhook */
  private async sendFeishuWebhook(webhookUrl: string, typeLabel: string, userLabel: string, content: string, timestamp: string, data: any) {
    await this.postWebhook(webhookUrl, {
      msg_type: 'text',
      content: {
        text: `【审核通知】类型：${typeLabel}，用户：${userLabel}，内容：${content.length > 200 ? content.substring(0, 200) + '...' : content}，时间：${timestamp}`,
      },
    }, 'feishu', data)
  }

  /** 钉钉 webhook */
  private async sendDingtalkWebhook(webhookUrl: string, typeLabel: string, userLabel: string, content: string, timestamp: string, data: any) {
    await this.postWebhook(webhookUrl, {
      msgtype: 'markdown',
      markdown: {
        title: '审核通知',
        text: `【审核通知】\n- 类型：${typeLabel}\n- 用户：${userLabel}\n- 内容：${content.length > 200 ? content.substring(0, 200) + '...' : content}\n- 时间：${timestamp}`,
      },
    }, 'dingtalk', data)
  }

  /** 发送 HTTP POST 到 webhook URL，并写入通知日志 */
  private async postWebhook(url: string, body: Record<string, unknown>, channel: string, data: any): Promise<void> {
    let success = 1
    let errorMessage = ''
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        success = 0
        errorMessage = `HTTP ${response.status}: ${await response.text().catch(() => '')}`
      }
    } catch (e: any) {
      success = 0
      errorMessage = e?.message || 'Unknown error'
    }

    // 写入通知日志
    try {
      const log = this.notifyLogRepository.create({
        notifyType: data.notifyType || data.type || 'audit',
        channel,
        success,
        errorMessage,
        userId: data.userId || null,
        userNickname: data.userNickname || null,
        source: data.type || data.source || 'audit',
        content: typeof data.content === 'string' ? data.content.substring(0, 500) : JSON.stringify(data.content || {}).substring(0, 500),
      })
      await this.notifyLogRepository.save(log)
    } catch {}

    if (!success) {
      console.error(`[AuditService] Webhook ${channel} 发送失败:`, errorMessage)
    }
  }

  /** 从 SystemConfig 读取字符串配置值 */
  private async getConfigValue(key: string): Promise<string | null> {
    if (!this.systemService) return null
    try {
      return await this.systemService.getConfig(key)
    } catch {
      return null
    }
  }

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

      // 审核结果为 review 且人工审核开启时，发送 webhook 通知
      if (aiSuggestion === 'Review') {
        const manualReviewEnabled = await this.getConfigValue('audit.manualReviewEnabled')
        if (manualReviewEnabled === '1' || manualReviewEnabled === 'true') {
          this.notifyWebhook('photo_upload', {
            userId,
            photoUrl,
            content: photoUrl,
            time: new Date().toISOString(),
          }).catch(() => {})
        }
      }

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

      // 审核结果为 review 且人工审核开启时，发送 webhook 通知
      if (result.result === 'review') {
        const manualReviewEnabled = await this.getConfigValue('audit.manualReviewEnabled')
        if (manualReviewEnabled === '1' || manualReviewEnabled === 'true') {
          // 根据 type 映射通知类型
          const notifyTypeMap: Record<string, string> = {
            answer: 'question_answer',
            photo: 'photo_upload',
            user: 'avatar_upload',
          }
          const notifyType = notifyTypeMap[type] || type
          this.notifyWebhook(notifyType, {
            userId,
            userNickname: '',
            content: text,
            time: new Date().toISOString(),
          }).catch(() => {})
        }
      }

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
