import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { AnswerLike } from '../entities/AnswerLike'
import { AuditLog } from '../entities/AuditLog'

export interface QuestionListResult {
  list: HotQuestion[]
  total: number
  page: number
  limit: number
}

export interface QuestionDetailResult {
  id: number
  title: string
  content: string
  answerCount: number
  answers: any[]
}

export interface HotQuestionWithAvatars {
  id: number
  title: string
  answerCount: number
  avatarList: string[]
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AnswerLike)
    private readonly answerLikeRepository: Repository<AnswerLike>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async getQuestions(page: number = 1, limit: number = 20): Promise<QuestionListResult> {
    const skip = (page - 1) * limit

    const [questions, total] = await this.questionRepository.findAndCount({
      where: { isActive: 1 },
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
      skip,
      take: limit,
    })

    return {
      list: questions,
      total,
      page,
      limit,
    }
  }

  async getHotQuestionsForHome(): Promise<HotQuestionWithAvatars[]> {
    // 获取置顶的热门问题（最多3个）
    const questions = await this.questionRepository.find({
      where: { isActive: 1 },
      order: { sortOrder: 'DESC', answerCount: 'DESC' },
      take: 3,
    })

    if (questions.length === 0) return []

    // 批量查询每个问题的回答用户头像
    const result: HotQuestionWithAvatars[] = []
    for (const q of questions) {
      const answers = await this.answerRepository.find({
        where: { questionId: q.id, status: 1 },
        relations: ['user'],
        order: { likeCount: 'DESC' },
        take: 3,
      })
      const avatarList = answers
        .map((a) => a.user?.avatar || '')
        .filter((url) => url && url.length > 0)
      result.push({
        id: q.id,
        title: q.title,
        answerCount: q.answerCount,
        avatarList,
      })
    }
    return result
  }

  async getQuestionDetail(id: number, page: number = 1, limit: number = 20): Promise<QuestionDetailResult> {
    const question = await this.questionRepository.findOne({
      where: { id, isActive: 1 },
    })

    if (!question) {
      throw new NotFoundException('问题不存在')
    }

    const skip = (page - 1) * limit

    const [answers, total] = await this.answerRepository.findAndCount({
      where: {
        questionId: id,
        status: 1,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    const formattedAnswers = answers.map(answer => ({
      id: answer.id,
      questionId: answer.questionId,
      userId: answer.userId,
      content: answer.content,
      photos: answer.photos || [],
      likeCount: answer.likeCount,
      createdAt: answer.createdAt,
      user: answer.user ? {
        nickname: answer.user.nickname,
        avatar: answer.user.avatar,
        age: answer.user.age,
        height: answer.user.height,
        weight: answer.user.weight,
        education: answer.user.education,
        incomeRange: answer.user.incomeRange,
      } : null,
    }))

    return {
      id: question.id,
      title: question.title,
      content: question.content,
      answerCount: total,
      answers: formattedAnswers,
    }
  }

  async createAnswer(questionId: number, userId: number, content: string, photos: string[] = []): Promise<QuestionAnswer> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId, isActive: 1 },
    })

    if (!question) {
      throw new NotFoundException('问题不存在')
    }

    // 使用 insert 确保所有字段（含 userId）写入数据库
    const insertResult = await this.answerRepository.insert({
      questionId,
      userId,
      content,
      photos,
      status: 0,
      likeCount: 0,
    } as any)

    const answerId = insertResult.identifiers[0]?.id
    if (!answerId) {
      throw new Error('回答创建失败')
    }

    await this.questionRepository.update(
      { id: questionId },
      { answerCount: question.answerCount + 1 },
    )

    // 创建审核记录
    const auditLog = this.auditLogRepository.create({
      action: 'PENDING',
      targetType: 'answer',
      targetId: answerId,
      submitterId: userId,
      content: (content || '').substring(0, 200),
    })
    await this.auditLogRepository.save(auditLog)

    return this.answerRepository.findOneOrFail({ where: { id: answerId } })
  }

  async likeAnswer(answerId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const answer = await queryRunner.manager.findOne(QuestionAnswer, {
        where: { id: answerId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!answer) {
        throw new NotFoundException('回答不存在')
      }

      const existingLike = await queryRunner.manager.findOne(AnswerLike, {
        where: { answerId, userId },
      })

      let liked = false

      if (existingLike) {
        await queryRunner.manager.remove(existingLike)
        await queryRunner.manager.update(
          QuestionAnswer,
          { id: answerId },
          { likeCount: () => 'likeCount - 1' },
        )
        liked = false
      } else {
        const newLike = this.answerLikeRepository.create({ answerId, userId })
        await queryRunner.manager.save(newLike)
        await queryRunner.manager.update(
          QuestionAnswer,
          { id: answerId },
          { likeCount: () => 'likeCount + 1' },
        )
        liked = true
      }

      await queryRunner.commitTransaction()

      const updatedAnswer = await this.answerRepository.findOne({
        where: { id: answerId },
      })

      return {
        liked,
        likeCount: updatedAnswer?.likeCount || 0,
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
