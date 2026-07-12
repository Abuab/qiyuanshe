import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Report } from '../entities/Report'
import { UserBlock } from '../entities/UserBlock'
import { UserNotification } from '../entities/UserNotification'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { HotQuestion } from '../entities/HotQuestion'
import { MatchRecord } from '../entities/MatchRecord'
import { MatchmakerReview } from '../entities/MatchmakerReview'
import { User } from '../entities/User'
import { AuditLog } from '../entities/AuditLog'

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
}
