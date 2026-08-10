import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MessageTemplate } from '../entities/MessageTemplate'

@Injectable()
export class AdminMessageTemplateService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly templateRepository: Repository<MessageTemplate>,
  ) {}

  async list(params: {
    page?: number
    limit?: number
    category?: string
    keyword?: string
  }) {
    const { page = 1, limit = 20, category, keyword } = params
    const qb = this.templateRepository
      .createQueryBuilder('t')
      .where('t.isDeleted = 0')
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.updatedAt', 'DESC')

    if (category) {
      qb.andWhere('t.category = :category', { category })
    }
    if (keyword) {
      qb.andWhere('(t.name LIKE :kw OR t.title LIKE :kw OR t.content LIKE :kw)', {
        kw: `%${keyword}%`,
      })
    }

    const [list, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    return { list, total, page, limit }
  }

  async detail(id: number): Promise<MessageTemplate | null> {
    return this.templateRepository.findOne({ where: { id, isDeleted: 0 } })
  }

  async create(data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const template = this.templateRepository.create(data)
    return this.templateRepository.save(template)
  }

  async update(id: number, data: Partial<MessageTemplate>): Promise<void> {
    await this.templateRepository.update(id, data)
  }

  async remove(id: number): Promise<void> {
    await this.templateRepository.update(id, { isDeleted: 1 })
  }

  /** 模板使用后记录使用次数 */
  async recordUsage(id: number): Promise<void> {
    await this.templateRepository.increment({ id }, 'useCount', 1)
    await this.templateRepository.update(id, { lastUsedAt: new Date() })
  }

  /** 获取所有可用模板（供群发选择） */
  async getSelectable(category?: string): Promise<MessageTemplate[]> {
    const where: any = { isDeleted: 0 }
    if (category) where.category = category
    return this.templateRepository.find({
      where,
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
      select: ['id', 'name', 'title', 'content', 'category', 'placeholders'],
    })
  }

  /** 对模板内容做占位符替换（{nickname} 等），传入用户数据 map */
  resolvePlaceholders(template: string, userData: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return userData[key] ?? match
    })
  }
}
