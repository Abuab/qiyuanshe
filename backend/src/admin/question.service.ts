import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { AdminRole } from '../shared/enums'

interface QuestionFilter {
  page?: number
  limit?: number
  keyword?: string
  type?: number
  status?: number
}

@Injectable()
export class AdminQuestionService {
  constructor(
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
  ) {}

  async list(filter: QuestionFilter, user?: { role?: string; id?: number }) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.questionRepository.createQueryBuilder('question')

    if (filter.keyword) {
      queryBuilder.where('question.title LIKE :keyword', {
        keyword: `%${filter.keyword}%`,
      })
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('question.status = :status', { status: filter.status })
    }

    // 红娘只能看自己创建的问答
    if (user && user.role === AdminRole.MATCHMAKER) {
      queryBuilder.andWhere('question.creatorId = :creatorId', { creatorId: user.id })
    }

    queryBuilder.orderBy('question.sortOrder', 'ASC').addOrderBy('question.createdAt', 'DESC')

    queryBuilder.skip(skip).take(limit)

    const [questions, total] = await queryBuilder.getManyAndCount()

    return {
      list: questions,
      page,
      limit,
      total,
    }
  }

  async detail(id: number) {
    return this.questionRepository.findOne({ where: { id } })
  }

  async create(data: Partial<HotQuestion>, creatorId?: number) {
    const question = this.questionRepository.create({
      ...data,
      creatorId: creatorId || null,
      status: data.status ?? data.isActive ?? 1,
      isActive: data.isActive ?? data.status ?? 1,
    })
    return this.questionRepository.save(question)
  }

  async update(id: number, data: Partial<HotQuestion>) {
    const updateData: any = { ...data }
    if (data.status !== undefined) {
      updateData.isActive = data.status
    }
    if (data.isActive !== undefined) {
      updateData.status = data.isActive
    }
    await this.questionRepository.update(id, updateData)
    // 返回更新后的数据
    return this.questionRepository.findOne({ where: { id } })
  }

  async delete(id: number) {
    // 先删除关联的回答
    await this.answerRepository.delete({ questionId: id })
    // 再删除问题
    await this.questionRepository.delete(id)
  }

  async updateSort(id: number, sortOrder: number) {
    await this.questionRepository.update(id, { sortOrder })
  }

  async getAnswers(questionId: number, page?: number, limit?: number) {
    const take = limit || 20
    const skip = page ? (page - 1) * take : 0

    const [answers, total] = await this.answerRepository.findAndCount({
      where: { questionId },
      order: { createdAt: 'DESC' },
      relations: ['user'],
      skip,
      take,
    })
    return {
      list: answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        userId: a.userId,
        content: a.content,
        photos: a.photos,
        likeCount: a.likeCount,
        status: a.status,
        createdAt: a.createdAt,
        userAvatar: a.user?.avatar || '',
        userNickname: a.user?.nickname || '用户' + a.userId,
      })),
      total,
      page: page || 1,
      limit: take,
    }
  }

  async deleteAnswer(answerId: number) {
    await this.answerRepository.delete(answerId)
  }
}
