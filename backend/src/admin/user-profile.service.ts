import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Report } from '../entities/Report'
import { UserBlock } from '../entities/UserBlock'
import { UserNotification } from '../entities/UserNotification'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { HotQuestion } from '../entities/HotQuestion'
import { MatchRecord } from '../entities/MatchRecord'
import { MatchmakerReview } from '../entities/MatchmakerReview'
import { User } from '../entities/User'
import { Dynamic } from '../entities/Dynamic'
import { AuditLog } from '../entities/AuditLog'
import { BroadcastLog } from '../entities/BroadcastLog'
import { DynamicService } from '../dynamic/dynamic.service'

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(UserBlock)
    private readonly blockRepository: Repository<UserBlock>,
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(MatchmakerReview)
    private readonly reviewRepository: Repository<MatchmakerReview>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Dynamic)
    private readonly dynamicRepository: Repository<Dynamic>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BroadcastLog)
    private readonly broadcastLogRepository: Repository<BroadcastLog>,
    private readonly dynamicService: DynamicService,
  ) {}

  async getReports(userId: number) {
    const reports = await this.reportRepository.find({
      where: { targetId: userId },
      order: { createdAt: 'DESC' },
    })
    return reports.map(r => ({
      id: r.id,
      reporterId: r.reporterId,
      targetId: r.targetId,
      type: r.type,
      reason: r.reason,
      description: r.description,
      status: r.status,
      result: r.result,
      createdAt: r.createdAt,
    }))
  }

  async getBlocks(userId: number, page?: number, limit?: number) {
    const take = limit || 20
    const skip = page ? (page - 1) * take : 0

    const [blocks, total] = await this.blockRepository.findAndCount({
      where: { blockedUserId: userId },
      relations: ['blocker'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    return {
      list: blocks.map(b => ({
        id: b.id,
        blockerId: b.blockerId,
        blockedUserId: b.blockedUserId,
        blockerNickname: b.blocker?.nickname || '用户' + b.blockerId,
        blockerAvatar: b.blocker?.avatar || '',
        createdAt: b.createdAt,
      })),
      total,
      page: page || 1,
      limit: take,
    }
  }

  async getNotifications(userId: number, page?: number, limit?: number) {
    const take = limit || 20
    const skip = page ? (page - 1) * take : 0

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    return {
      list: notifications,
      total,
      page: page || 1,
      limit: take,
    }
  }

  async getAnswers(userId: number, page?: number, limit?: number) {
    const take = limit || 20
    const skip = page ? (page - 1) * take : 0

    const [answers, total] = await this.answerRepository.findAndCount({
      where: { userId },
      relations: ['question'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    return {
      list: answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        userId: a.userId,
        content: a.content,
        likeCount: a.likeCount,
        status: a.status,
        createdAt: a.createdAt,
        questionTitle: a.question?.title || '未知问题',
      })),
      total,
      page: page || 1,
      limit: take,
    }
  }

  async getMatchRecords(userId: number, page?: number, limit?: number) {
    const take = limit || 20
    const skip = page ? (page - 1) * take : 0

    const queryBuilder = this.matchRecordRepository.createQueryBuilder('mr')
      .leftJoinAndSelect('mr.matchedUser', 'matchedUser')
      .leftJoinAndSelect('mr.matchmaker', 'matchmaker')
      .where('mr.userId = :userId', { userId })
      .orderBy('mr.createdAt', 'DESC')
      .skip(skip)
      .take(take)

    const [records, total] = await queryBuilder.getManyAndCount()

    return {
      list: records.map(r => ({
        id: r.id,
        userId: r.userId,
        matchedUserId: r.matchedUserId,
        matchedNickname: r.matchedUser?.nickname || '用户' + r.matchedUserId,
        matchedAvatar: r.matchedUser?.avatar || '',
        matchmakerId: r.matchmakerId,
        matchmakerName: r.matchmaker?.name || '-',
        status: r.status,
        remark: r.remark,
        createdAt: r.createdAt,
      })),
      total,
      page: page || 1,
      limit: take,
    }
  }

  async getReviews(userId: number) {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['matchmaker'],
      order: { createdAt: 'DESC' },
    })
    return reviews.map(r => ({
      id: r.id,
      userId: r.userId,
      matchmakerId: r.matchmakerId,
      matchmakerName: r.matchmaker?.name || '红娘' + r.matchmakerId,
      content: r.content,
      difficulty: r.difficulty,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  }

  async createReview(userId: number, data: { matchmakerId: number; content?: string; difficulty?: string }) {
    const review = this.reviewRepository.create({
      userId,
      matchmakerId: data.matchmakerId,
      content: data.content || '',
      difficulty: data.difficulty || '',
    })
    const saved = await this.reviewRepository.save(review)

    // 同时创建 match_record，使其在动态页红娘区展示
    try {
      const record = this.matchRecordRepository.create({
        userId,                     // 被评价用户自己看不到这条
        matchedUserId: userId,
        matchmakerId: data.matchmakerId,
        remark: data.content || '',
        status: 'in_progress',
      })
      await this.matchRecordRepository.save(record)
    } catch (e) { /* 非关键路径，不影响主流程 */ }

    return saved
  }

  async updateReview(reviewId: number, data: { content?: string; difficulty?: string }) {
    await this.reviewRepository.update(reviewId, data)
    return this.reviewRepository.findOne({ where: { id: reviewId }, relations: ['matchmaker'] })
  }

  async deleteReview(reviewId: number) {
    await this.reviewRepository.delete(reviewId)
  }

  async sendNotification(userId: number, title: string, content: string, senderType = 'admin', senderId?: number) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      content,
      senderType,
      senderId,
    })
    return this.notificationRepository.save(notification)
  }

  async approveAnswer(answerId: number) {
    // 更新回答状态为通过
    await this.answerRepository.update(answerId, { status: 1 })

    // 更新审核记录
    await this.auditLogRepository.update(
      { targetType: 'answer', targetId: answerId, action: 'PENDING' },
      { action: 'APPROVE' },
    )

    // 审批通过后生成动态，使其出现在小程序动态页
    // 先检查是否已有动态记录（如曾被拒绝后重新通过），避免重复生成
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['question'],
    })
    if (answer && answer.question) {
      const existingDynamic = await this.dynamicRepository
          .findOne({ where: { referenceId: answer.id, type: 'answer' } })
      if (!existingDynamic) {
        this.dynamicService.autoCreateDynamic({
          userId: answer.userId,
          type: 'answer',
          content: answer.content,
          images: answer.photos || [],
          referenceId: answer.id,
          questionId: answer.questionId,
          questionTitle: answer.question.title,
        }).catch((e) => {
          console.error('[UserProfileService] 回答审批通过后生成动态失败:', e)
        })
      }
    }
  }

  async rejectAnswer(answerId: number, reason: string) {
    // 更新回答状态为拒绝
    await this.answerRepository.update(answerId, { status: 2 })

    // 更新审核记录
    await this.auditLogRepository.update(
      { targetType: 'answer', targetId: answerId, action: 'PENDING' },
      { action: 'REJECT', reason },
    )
  }

  async createAnswer(userId: number, questionId: number, content: string) {
    // 管理员代答：进入待审核状态，走正常审批流程（审核通过后由审核操作置为已通过）
    const answer = this.answerRepository.create({
      userId,
      questionId,
      content,
      status: 0, // 待审核
      likeCount: 0,
    })
    const saved = await this.answerRepository.save(answer)

    // 更新问题的答案计数（与用户端提交行为保持一致：创建即计数）
    await this.questionRepository.increment({ id: questionId }, 'answerCount', 1)

    // 创建审核记录，供审核中心 / 用户详情页进行审批
    const auditLog = this.auditLogRepository.create({
      action: 'PENDING',
      targetType: 'answer',
      targetId: saved.id,
      submitterId: userId,
      content: (content || '').substring(0, 200),
    })
    await this.auditLogRepository.save(auditLog)

    return saved
  }

  /** 群发系统通知给所有活跃用户（或指定用户） */
  async broadcastNotification(
    title: string,
    content: string,
    senderId: number,
    targetUserIds?: number[],
  ) {
    const BATCH_SIZE = 500
    let totalSent = 0

    if (targetUserIds && targetUserIds.length > 0) {
      // 指定用户：直接按 ID 列表分批查询
      for (let i = 0; i < targetUserIds.length; i += BATCH_SIZE) {
        const batch = targetUserIds.slice(i, i + BATCH_SIZE)
        const users = await this.userRepository.find({
          where: batch.map(id => ({ id, isDeleted: 0 } as any)),
          select: ['id'],
        })
        if (users.length === 0) continue

        const notifications = users.map(u =>
          this.notificationRepository.create({
            userId: u.id,
            title,
            content,
            senderType: 'admin',
            senderId,
          }),
        )
        await this.notificationRepository.save(notifications)
        totalSent += notifications.length
      }
    } else {
      // 全部用户：skip + take 分页
      let offset = 0
      while (true) {
        const users = await this.userRepository.find({
          where: { isDeleted: 0 },
          select: ['id'],
          order: { id: 'ASC' },
          skip: offset,
          take: BATCH_SIZE,
        })
        if (users.length === 0) break

        const notifications = users.map(u =>
          this.notificationRepository.create({
            userId: u.id,
            title,
            content,
            senderType: 'admin',
            senderId,
          }),
        )
        await this.notificationRepository.save(notifications)
        totalSent += notifications.length

        if (users.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }
    }

    // 写入发送日志
    await this.broadcastLogRepository.save(
      this.broadcastLogRepository.create({
        senderId,
        title,
        content,
        totalSent,
        targetUserIds: targetUserIds || null,
      }),
    )

    return { totalSent }
  }

  /** 查询群发消息日志 */
  async getBroadcastLogs(page = 1, limit = 20) {
    const [list, total] = await this.broadcastLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // 收集所有 targetUserIds 中的用户 ID
    const allUserIds = new Set<number>()
    for (const log of list) {
      if (log.targetUserIds && log.targetUserIds.length > 0) {
        for (const uid of log.targetUserIds) {
          allUserIds.add(uid)
        }
      }
    }

    // 批量查询用户昵称
    let userMap: Record<number, string> = {}
    if (allUserIds.size > 0) {
      const users = await this.userRepository.find({
        where: { id: In(Array.from(allUserIds)) },
        select: ['id', 'nickname'],
      })
      for (const u of users) {
        userMap[u.id] = u.nickname
      }
    }

    // 为每条日志附加用户信息
    const enrichedList = list.map(log => ({
      ...log,
      targetUsers: log.targetUserIds
        ? log.targetUserIds.map(id => ({ id, nickname: userMap[id] || '未知用户' }))
        : null,
    }))

    return { list: enrichedList, total, page, limit }
  }
}
