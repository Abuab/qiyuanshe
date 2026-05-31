import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'

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

  async list(filter: QuestionFilter) {
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

  async create(data: Partial<HotQuestion>) {
    const question = this.questionRepository.create({
      ...data,
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
  }

  async delete(id: number) {
    await this.questionRepository.delete(id)
  }

  async updateSort(id: number, sortOrder: number) {
    await this.questionRepository.update(id, { sortOrder })
  }

  async getAnswers(questionId: number) {
    return this.answerRepository.find({
      where: { questionId },
      order: { createdAt: 'DESC' },
    })
  }

  async deleteAnswer(answerId: number) {
    await this.answerRepository.delete(answerId)
  }
}
