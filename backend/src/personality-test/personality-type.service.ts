import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, Like } from 'typeorm'
import { PersonalityType } from './entities/PersonalityType'

/**
 * 人格测试 - 人格类型定义服务
 */
@Injectable()
export class PersonalityTypeService {
  constructor(
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
  ) {}

  async getAdminList(params: {
    page?: number
    limit?: number
    keyword?: string
    isEnabled?: number
  }): Promise<{ items: PersonalityType[]; total: number }> {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 20))
    const where: any = { isDeleted: 0 }
    if (params.keyword) where.name = Like(`%${params.keyword}%`)
    if (params.isEnabled !== undefined && params.isEnabled !== null) {
      where.isEnabled = params.isEnabled
    }
    const [items, total] = await this.typeRepo.findAndCount({
      where,
      order: { sort: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { items, total }
  }

  /** 全部启用类型（供适配推荐选择、下拉使用） */
  async optionsList(): Promise<Pick<PersonalityType, 'id' | 'code' | 'name' | 'nickname'>[]> {
    const items = await this.typeRepo.find({
      where: { isDeleted: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    })
    return items.map((t) => ({ id: t.id, code: t.code, name: t.name, nickname: t.nickname }))
  }

  async getById(id: number): Promise<PersonalityType> {
    const item = await this.typeRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!item) throw new BadRequestException('人格类型不存在')
    return item
  }

  async create(data: any): Promise<PersonalityType> {
    const payload = await this.validate(data, null)
    const dup = await this.typeRepo.findOne({
      where: { code: payload.code, isDeleted: 0 },
    })
    if (dup) throw new BadRequestException('人格类型编码已存在')
    const entity = this.typeRepo.create({
      ...payload,
      sort: this.normalizeSort(data.sort),
      isEnabled: data.isEnabled === 0 ? 0 : 1,
      isDeleted: 0,
    })
    return this.typeRepo.save(entity)
  }

  async update(id: number, data: any): Promise<PersonalityType> {
    const item = await this.getById(id)
    const payload = await this.validate(data, id)
    if (payload.code !== item.code) {
      const dup = await this.typeRepo.findOne({
        where: { code: payload.code, isDeleted: 0, id: Not(id) },
      })
      if (dup) throw new BadRequestException('人格类型编码已存在')
    }
    Object.assign(item, payload)
    if (data.sort !== undefined) item.sort = this.normalizeSort(data.sort)
    if (data.isEnabled !== undefined) item.isEnabled = data.isEnabled ? 1 : 0
    return this.typeRepo.save(item)
  }

  async setEnabled(id: number, isEnabled: number): Promise<void> {
    const item = await this.getById(id)
    item.isEnabled = isEnabled ? 1 : 0
    await this.typeRepo.save(item)
  }

  async remove(id: number): Promise<void> {
    const item = await this.getById(id)
    item.isDeleted = 1
    await this.typeRepo.save(item)
  }

  // ==================== 内部校验 ====================

  private async validate(data: any, selfId: number | null): Promise<{
    code: string
    name: string
    nickname: string | null
    summary: string | null
    description: string | null
    radarEnergy: number
    radarInfo: number
    radarDecision: number
    radarLifestyle: number
    matchTypes: string[] | null
  }> {
    const code = (data.code ?? '').toString().trim().toUpperCase()
    const name = (data.name ?? '').toString().trim()
    if (!code) throw new BadRequestException('类型编码不能为空')
    if (!name) throw new BadRequestException('类型中文名称不能为空')

    const nickname = this.trimOrNull(data.nickname)
    const summary = this.trimOrNull(data.summary)
    const description = this.trimOrNull(data.description)

    const radarEnergy = this.validateRadar(data.radarEnergy, '能量来源')
    const radarInfo = this.validateRadar(data.radarInfo, '信息获取')
    const radarDecision = this.validateRadar(data.radarDecision, '决策方式')
    const radarLifestyle = this.validateRadar(data.radarLifestyle, '生活方式')

    // 适配推荐类型列表：去重、去空、不含自身编码
    let matchTypes: string[] | null = null
    if (Array.isArray(data.matchTypes)) {
      const cleaned = [
        ...new Set(
          data.matchTypes
            .map((t: any) => (t ?? '').toString().trim().toUpperCase())
            .filter((t: string) => t && t !== code),
        ),
      ] as string[]
      matchTypes = cleaned.length ? cleaned : null
    }

    return {
      code,
      name,
      nickname,
      summary,
      description,
      radarEnergy,
      radarInfo,
      radarDecision,
      radarLifestyle,
      matchTypes,
    }
  }

  private validateRadar(value: any, label: string): number {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new BadRequestException(`${label}雷达图基准值需在 0-100 之间`)
    }
    return Math.round(n)
  }

  private trimOrNull(value: any): string | null {
    if (value === undefined || value === null) return null
    const s = value.toString().trim()
    return s || null
  }

  private normalizeSort(sort: any): number {
    const n = Number(sort)
    if (!Number.isInteger(n) || n < 1) return 1
    return n
  }
}
