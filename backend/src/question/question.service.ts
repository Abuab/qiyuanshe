import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { AnswerLike } from '../entities/AnswerLike'

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

    const answer = this.answerRepository.create({
      questionId,
      userId,
      content,
      photos,
      status: 0,
      likeCount: 0,
    })

    const savedAnswer = await this.answerRepository.save(answer)

    await this.questionRepository.update(
      { id: questionId },
      { answerCount: question.answerCount + 1 }
    )

    return savedAnswer
  }

  async likeAnswer(answerId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
    })

    if (!answer) {
      throw new NotFoundException('回答不存在')
    }

    const existingLike = await this.answerLikeRepository.findOne({
      where: {
        answerId,
        userId,
      },
    })

    let liked = false

    if (existingLike) {
      await this.answerLikeRepository.remove(existingLike)
      await this.answerRepository.update(
        { id: answerId },
        { likeCount: answer.likeCount - 1 }
      )
      liked = false
    } else {
      const newLike = this.answerLikeRepository.create({
        answerId,
        userId,
      })
      await this.answerLikeRepository.save(newLike)
      await this.answerRepository.update(
        { id: answerId },
        { likeCount: answer.likeCount + 1 }
      )
      liked = true
    }

    const updatedAnswer = await this.answerRepository.findOne({
      where: { id: answerId },
    })

    return {
      liked,
      likeCount: updatedAnswer?.likeCount || 0,
    }
  }
}
