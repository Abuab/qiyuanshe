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
    return this.reviewRepository.save(review)
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
}
