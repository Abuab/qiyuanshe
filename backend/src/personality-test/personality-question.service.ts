import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, Like, DataSource } from 'typeorm'
import { PersonalityQuestion } from './entities/PersonalityQuestion'
import { PersonalityOption } from './entities/PersonalityOption'
import { PersonalityDimension } from './entities/PersonalityDimension'

interface OptionInput {
  optionLabel?: string
  content: string
  directionKey: string
  score?: number
}

interface QuestionInput {
  content: string
  dimensionId: number
  sort?: number
  isEnabled?: number
  options: OptionInput[]
}

/**
 * 人格测试 - 题目 & 选项管理服务
 */
@Injectable()
export class PersonalityQuestionService {
  constructor(
    @InjectRepository(PersonalityQuestion)
    private readonly questionRepo: Repository<PersonalityQuestion>,
    @InjectRepository(PersonalityOption)
    private readonly optionRepo: Repository<PersonalityOption>,
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    private readonly dataSource: DataSource,
  ) {}

  /** 分页列表（管理后台） */
  async getAdminList(params: {
    page?: number
    limit?: number
    keyword?: string
    dimensionId?: number
    isEnabled?: number
  }): Promise<{ items: any[]; total: number }> {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 20))
    const where: any = { isDeleted: 0 }

    if (params.keyword) where.content = Like(`%${params.keyword}%`)
    if (params.dimensionId !== undefined && params.dimensionId !== null) {
      where.dimensionId = params.dimensionId
    }
    if (params.isEnabled !== undefined && params.isEnabled !== null) {
      where.isEnabled = params.isEnabled
    }

    const [items, total] = await this.questionRepo.findAndCount({
      where,
      order: { sort: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const enriched = await this.enrich(items)
    return { items: enriched, total }
  }

  /** 获取单题详情（含维度信息和选项） */
  async getDetail(id: number): Promise<any> {
    const question = await this.questionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!question) throw new BadRequestException('题目不存在')
    const [enriched] = await this.enrich([question])
    return enriched
  }

  /** 新增题目（含两个选项） */
  async create(data: QuestionInput): Promise<any> {
    const { content, dimension, sort, isEnabled, options } = await this.validate(data)

    return this.dataSource.transaction(async (manager) => {
      const question = manager.create(PersonalityQuestion, {
        content,
        dimensionId: dimension.id,
        sort,
        isEnabled,
        isDeleted: 0,
      })
      const saved = await manager.save(question)

      const optionEntities = options.map((o, idx) =>
        manager.create(PersonalityOption, {
          questionId: saved.id,
          optionLabel: o.optionLabel || (idx === 0 ? 'A' : 'B'),
          content: o.content,
          directionKey: o.directionKey,
          score: o.score,
          sort: idx,
        }),
      )
      await manager.save(optionEntities)
      return this.getDetailWithManager(manager, saved.id)
    })
  }

  /** 编辑题目（含两个选项，整体替换选项） */
  async update(id: number, data: QuestionInput): Promise<any> {
    const existing = await this.questionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!existing) throw new BadRequestException('题目不存在')

    const { content, dimension, sort, isEnabled, options } = await this.validate(data)

    return this.dataSource.transaction(async (manager) => {
      existing.content = content
      existing.dimensionId = dimension.id
      existing.sort = sort
      existing.isEnabled = isEnabled
      await manager.save(existing)

      // 整体替换选项，保证与维度方向一致
      await manager.delete(PersonalityOption, { questionId: id })
      const optionEntities = options.map((o, idx) =>
        manager.create(PersonalityOption, {
          questionId: id,
          optionLabel: o.optionLabel || (idx === 0 ? 'A' : 'B'),
          content: o.content,
          directionKey: o.directionKey,
          score: o.score,
          sort: idx,
        }),
      )
      await manager.save(optionEntities)
      return this.getDetailWithManager(manager, id)
    })
  }

  async setEnabled(id: number, isEnabled: number): Promise<void> {
    const q = await this.questionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!q) throw new BadRequestException('题目不存在')
    q.isEnabled = isEnabled ? 1 : 0
    await this.questionRepo.save(q)
  }

  async reorder(id: number, sort: number): Promise<void> {
    const q = await this.questionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!q) throw new BadRequestException('题目不存在')
    q.sort = this.normalizeSort(sort)
    await this.questionRepo.save(q)
  }

  async remove(id: number): Promise<void> {
    const q = await this.questionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!q) throw new BadRequestException('题目不存在')
    q.isDeleted = 1
    await this.questionRepo.save(q)
  }

  async batchRemove(ids: number[]): Promise<void> {
    if (!ids?.length) return
    await this.questionRepo.update({ id: In(ids), isDeleted: 0 }, { isDeleted: 1 })
  }

  async batchSetEnabled(ids: number[], isEnabled: number): Promise<void> {
    if (!ids?.length) return
    await this.questionRepo.update(
      { id: In(ids), isDeleted: 0 },
      { isEnabled: isEnabled ? 1 : 0 },
    )
  }

  // ==================== 内部方法 ====================

  /** 校验题目 & 选项，返回规范化后的数据 */
  private async validate(data: QuestionInput): Promise<{
    content: string
    dimension: PersonalityDimension
    sort: number
    isEnabled: number
    options: Required<OptionInput>[]
  }> {
    const content = (data.content ?? '').toString().trim()
    if (!content) throw new BadRequestException('题目文本不能为空')
    if (content.length > 500) throw new BadRequestException('题目文本长度不能超过500字')

    // 必须且只能关联一个维度
    if (data.dimensionId === undefined || data.dimensionId === null) {
      throw new BadRequestException('必须选择所属维度')
    }
    const dimension = await this.dimensionRepo.findOne({
      where: { id: Number(data.dimensionId), isDeleted: 0 },
    })
    if (!dimension) throw new BadRequestException('所属维度不存在')

    // 必须恰好两个选项
    const options = Array.isArray(data.options) ? data.options : []
    if (options.length !== 2) throw new BadRequestException('每道题必须配置两个选项')

    const validKeys = [dimension.directionAKey, dimension.directionBKey]
    const normalized: Required<OptionInput>[] = options.map((o, idx) => {
      const text = (o.content ?? '').toString().trim()
      if (!text) throw new BadRequestException('选项文本不能为空')
      if (text.length > 500) throw new BadRequestException('选项文本长度不能超过500字')

      const directionKey = (o.directionKey ?? '').toString().trim()
      if (!validKeys.includes(directionKey)) {
        throw new BadRequestException(
          `选项方向必须是所属维度的方向之一（${dimension.directionAKey} / ${dimension.directionBKey}）`,
        )
      }

      let score = o.score === undefined || o.score === null ? 1 : Number(o.score)
      if (!Number.isFinite(score) || score < 0) score = 1

      return {
        optionLabel: (o.optionLabel || (idx === 0 ? 'A' : 'B')).toString(),
        content: text,
        directionKey,
        score,
      }
    })

    // 两个选项必须分别指向该维度的两个不同方向
    if (normalized[0].directionKey === normalized[1].directionKey) {
      throw new BadRequestException('两个选项必须分别指向该维度的两个不同方向')
    }

    return {
      content,
      dimension,
      sort: this.normalizeSort(data.sort),
      isEnabled: data.isEnabled === 0 ? 0 : 1,
      options: normalized,
    }
  }

  private normalizeSort(sort: any): number {
    const n = Number(sort)
    if (!Number.isInteger(n) || n < 1) return 1
    return n
  }

  /** 为题目列表补充维度信息与选项 */
  private async enrich(questions: PersonalityQuestion[]): Promise<any[]> {
    if (!questions.length) return []
    const dimensionIds = [...new Set(questions.map((q) => q.dimensionId))]
    const questionIds = questions.map((q) => q.id)

    const dimensions = await this.dimensionRepo.find({ where: { id: In(dimensionIds) } })
    const dimensionMap = new Map(dimensions.map((d) => [d.id, d]))

    const options = await this.optionRepo.find({
      where: { questionId: In(questionIds) },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const optionMap = new Map<number, PersonalityOption[]>()
    for (const o of options) {
      const arr = optionMap.get(o.questionId) || []
      arr.push(o)
      optionMap.set(o.questionId, arr)
    }

    return questions.map((q) => ({
      id: q.id,
      content: q.content,
      dimensionId: q.dimensionId,
      dimension: dimensionMap.get(q.dimensionId) || null,
      sort: q.sort,
      isEnabled: q.isEnabled,
      options: optionMap.get(q.id) || [],
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }))
  }

  private async getDetailWithManager(manager: any, id: number): Promise<any> {
    const question = await manager.findOne(PersonalityQuestion, { where: { id } })
    const dimension = await manager.findOne(PersonalityDimension, {
      where: { id: question.dimensionId },
    })
    const options = await manager.find(PersonalityOption, {
      where: { questionId: id },
      order: { sort: 'ASC', id: 'ASC' },
    })
    return {
      id: question.id,
      content: question.content,
      dimensionId: question.dimensionId,
      dimension: dimension || null,
      sort: question.sort,
      isEnabled: question.isEnabled,
      options,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }
  }
}
