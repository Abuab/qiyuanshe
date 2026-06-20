import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Not, Like } from 'typeorm'
import { QuickQuestion } from '../entities/QuickQuestion'
import { QuickQuestionCategory } from '../entities/QuickQuestionCategory'

@Injectable()
export class QuickQuestionService {
  private readonly logger = new Logger(QuickQuestionService.name)

  constructor(
    @InjectRepository(QuickQuestion)
    private readonly questionRepo: Repository<QuickQuestion>,
    @InjectRepository(QuickQuestionCategory)
    private readonly categoryRepo: Repository<QuickQuestionCategory>,
  ) {}

  // ==================== 公开接口 ====================

  /**
   * 获取启用的快捷问题列表（小程序端用）
   * 支持按分类筛选，按 sort ASC 排序
   */
  async getEnabledList(categoryId?: number): Promise<QuickQuestion[]> {
    const where: any = { isEnabled: 1, isDeleted: 0 }
    if (categoryId !== undefined && categoryId !== null) {
      where.categoryId = categoryId
    }
    return this.questionRepo.find({
      where,
      order: { sort: 'ASC', id: 'ASC' },
      select: ['id', 'content', 'categoryId', 'sort'],
    })
  }

  /**
   * 点击统计上报（异步，不阻塞前端）
   */
  async incrementClick(id: number): Promise<void> {
    try {
      await this.questionRepo.increment({ id, isDeleted: 0 }, 'clickCount', 1)
    } catch (e: any) {
      this.logger.warn(`点击统计失败 questionId=${id}: ${e?.message}`)
    }
  }

  // ==================== 管理后台接口 ====================

  /**
   * 获取快捷问题列表（管理后台，含分页、搜索、分类筛选）
   */
  async getAdminList(params: {
    page?: number
    limit?: number
    keyword?: string
    categoryId?: number
    isEnabled?: number
  }): Promise<{ items: QuickQuestion[]; total: number }> {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 20))
    const where: any = { isDeleted: 0 }

    if (params.keyword) {
      where.content = Like(`%${params.keyword}%`)
    }
    if (params.categoryId !== undefined && params.categoryId !== null) {
      where.categoryId = params.categoryId
    }
    if (params.isEnabled !== undefined && params.isEnabled !== null) {
      where.isEnabled = params.isEnabled
    }

    const [items, total] = await this.questionRepo.findAndCount({
      where,
      relations: ['category'],
      order: { sort: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { items, total }
  }

  /**
   * 获取单条快捷问题
   */
  async getById(id: number): Promise<QuickQuestion> {
    const q = await this.questionRepo.findOne({
      where: { id, isDeleted: 0 },
      relations: ['category'],
    })
    if (!q) throw new BadRequestException('快捷问题不存在')
    return q
  }

  /**
   * 新增快捷问题
   */
  async create(data: { content: string; categoryId?: number | null; sort?: number; isEnabled?: number }): Promise<QuickQuestion> {
    const content = data.content?.trim()
    if (!content || content.length < 2 || content.length > 20) {
      throw new BadRequestException('问题内容长度需在2-20字之间')
    }

    // 检查重复
    const existing = await this.questionRepo.findOne({
      where: { content, isDeleted: 0 },
    })
    if (existing) {
      throw new BadRequestException('该问题内容已存在')
    }

    // 校验分类
    if (data.categoryId) {
      await this.validateCategory(data.categoryId)
    }

    const q = this.questionRepo.create({
      content,
      categoryId: data.categoryId ?? null,
      sort: data.sort ?? 0,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : 1,
    })
    return this.questionRepo.save(q)
  }

  /**
   * 编辑快捷问题
   */
  async update(id: number, data: { content?: string; categoryId?: number | null; sort?: number; isEnabled?: number }): Promise<QuickQuestion> {
    const q = await this.getById(id)

    if (data.content !== undefined) {
      const content = data.content.trim()
      if (!content || content.length < 2 || content.length > 20) {
        throw new BadRequestException('问题内容长度需在2-20字之间')
      }
      // 检查重复（排除自己）
      const existing = await this.questionRepo.findOne({
        where: { content, isDeleted: 0, id: Not(id) },
      })
      if (existing) {
        throw new BadRequestException('该问题内容已存在')
      }
      q.content = content
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId !== null) {
        await this.validateCategory(data.categoryId)
      }
      q.categoryId = data.categoryId
    }
    if (data.sort !== undefined) q.sort = data.sort
    if (data.isEnabled !== undefined) q.isEnabled = data.isEnabled

    return this.questionRepo.save(q)
  }

  /**
   * 删除快捷问题（软删除）
   */
  async remove(id: number): Promise<void> {
    const q = await this.getById(id)
    q.isDeleted = 1
    await this.questionRepo.save(q)
  }

  /**
   * 批量删除
   */
  async batchRemove(ids: number[]): Promise<void> {
    await this.questionRepo.update(
      { id: In(ids), isDeleted: 0 },
      { isDeleted: 1 },
    )
  }

  /**
   * 批量启用/禁用
   */
  async batchSetEnabled(ids: number[], isEnabled: number): Promise<void> {
    await this.questionRepo.update(
      { id: In(ids), isDeleted: 0 },
      { isEnabled },
    )
  }

  /**
   * 拖拽排序（交换两个问题的排序权重）
   */
  async reorder(id: number, targetSort: number): Promise<void> {
    const q = await this.getById(id)
    q.sort = targetSort
    await this.questionRepo.save(q)
  }

  /**
   * 获取点击统计数据
   * period: 'today' | 'week' | 'month'
   */
  async getClickStats(period: 'today' | 'week' | 'month' = 'week'): Promise<any[]> {
    const dateWhere = this.getDateRangeFilter(period)

    return this.questionRepo.find({
      where: { isDeleted: 0, ...dateWhere },
      select: ['id', 'content', 'categoryId', 'clickCount', 'sort'],
      order: { clickCount: 'DESC' },
      take: 20,
    })
  }

  // ==================== 分类管理 ====================

  async getCategoryList(): Promise<QuickQuestionCategory[]> {
    return this.categoryRepo.find({
      where: { isDeleted: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    })
  }

  async createCategory(data: { name: string; sort?: number }): Promise<QuickQuestionCategory> {
    const name = data.name?.trim()
    if (!name || name.length > 10) {
      throw new BadRequestException('分类名称长度需在1-10字之间')
    }
    const existing = await this.categoryRepo.findOne({
      where: { name, isDeleted: 0 },
    })
    if (existing) {
      throw new BadRequestException('该分类名称已存在')
    }
    const cat = this.categoryRepo.create({
      name,
      sort: data.sort ?? 0,
      isEnabled: 1,
    })
    return this.categoryRepo.save(cat)
  }

  async updateCategory(id: number, data: { name?: string; sort?: number; isEnabled?: number }): Promise<QuickQuestionCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!cat) throw new BadRequestException('分类不存在')
    if (data.name !== undefined) {
      const name = data.name.trim()
      if (!name || name.length > 10) {
        throw new BadRequestException('分类名称长度需在1-10字之间')
      }
      const dup = await this.categoryRepo.findOne({
        where: { name, isDeleted: 0, id: Not(id) },
      })
      if (dup) throw new BadRequestException('该分类名称已存在')
      cat.name = name
    }
    if (data.sort !== undefined) cat.sort = data.sort
    if (data.isEnabled !== undefined) cat.isEnabled = data.isEnabled
    return this.categoryRepo.save(cat)
  }

  async deleteCategory(id: number): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!cat) throw new BadRequestException('分类不存在')
    // 将关联问题的分类置空
    await this.questionRepo.update({ categoryId: id }, { categoryId: null })
    cat.isDeleted = 1
    await this.categoryRepo.save(cat)
  }

  // ==================== 内部方法 ====================

  private async validateCategory(categoryId: number): Promise<void> {
    const cat = await this.categoryRepo.findOne({
      where: { id: categoryId, isDeleted: 0 },
    })
    if (!cat) {
      throw new BadRequestException('分类不存在')
    }
  }

  private getDateRangeFilter(period: 'today' | 'week' | 'month'): any {
    // 主要用于点击统计，但 clickCount 是累计值，此处返回空对象
    // 如需按时间段统计点击，需要额外的 ClickEvent 表
    // 当前实现：返回所有未删除的记录
    return {}
  }
}
