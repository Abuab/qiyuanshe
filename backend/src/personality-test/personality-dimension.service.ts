import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not } from 'typeorm'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityQuestion } from './entities/PersonalityQuestion'

/**
 * 人格测试 - 维度管理服务
 */
@Injectable()
export class PersonalityDimensionService {
  constructor(
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    @InjectRepository(PersonalityQuestion)
    private readonly questionRepo: Repository<PersonalityQuestion>,
  ) {}

  /** 维度列表（管理后台，全部，含禁用） */
  async list(): Promise<PersonalityDimension[]> {
    return this.dimensionRepo.find({
      where: { isDeleted: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    })
  }

  /** 启用的维度列表（供题目编辑选择） */
  async enabledList(): Promise<PersonalityDimension[]> {
    return this.dimensionRepo.find({
      where: { isDeleted: 0, isEnabled: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    })
  }

  async getById(id: number): Promise<PersonalityDimension> {
    const item = await this.dimensionRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!item) throw new BadRequestException('维度不存在')
    return item
  }

  async create(data: any): Promise<PersonalityDimension> {
    const payload = this.validate(data)
    // 编码唯一
    const dup = await this.dimensionRepo.findOne({
      where: { code: payload.code, isDeleted: 0 },
    })
    if (dup) throw new BadRequestException('维度编码已存在')

    const entity = this.dimensionRepo.create({
      ...payload,
      sort: this.normalizeSort(data.sort),
      isEnabled: data.isEnabled === 0 ? 0 : 1,
      isDeleted: 0,
    })
    return this.dimensionRepo.save(entity)
  }

  async update(id: number, data: any): Promise<PersonalityDimension> {
    const item = await this.getById(id)
    const payload = this.validate(data)
    if (payload.code !== item.code) {
      const dup = await this.dimensionRepo.findOne({
        where: { code: payload.code, isDeleted: 0, id: Not(id) },
      })
      if (dup) throw new BadRequestException('维度编码已存在')
    }
    Object.assign(item, payload)
    if (data.sort !== undefined) item.sort = this.normalizeSort(data.sort)
    if (data.isEnabled !== undefined) item.isEnabled = data.isEnabled ? 1 : 0
    return this.dimensionRepo.save(item)
  }

  async setEnabled(id: number, isEnabled: number): Promise<void> {
    const item = await this.getById(id)
    item.isEnabled = isEnabled ? 1 : 0
    await this.dimensionRepo.save(item)
  }

  async reorder(id: number, sort: number): Promise<void> {
    const item = await this.getById(id)
    item.sort = this.normalizeSort(sort)
    await this.dimensionRepo.save(item)
  }

  async remove(id: number): Promise<void> {
    const item = await this.getById(id)
    // 存在关联题目时不允许删除，避免题目失去维度
    const count = await this.questionRepo.count({
      where: { dimensionId: id, isDeleted: 0 },
    })
    if (count > 0) {
      throw new BadRequestException(`该维度下存在 ${count} 道题目，请先移除题目后再删除`)
    }
    item.isDeleted = 1
    await this.dimensionRepo.save(item)
  }

  // ==================== 内部校验 ====================

  private validate(data: any): {
    code: string
    name: string
    directionAKey: string
    directionALabel: string
    directionBKey: string
    directionBLabel: string
    icon: string | null
  } {
    const code = (data.code ?? '').toString().trim()
    const name = (data.name ?? '').toString().trim()
    const directionAKey = (data.directionAKey ?? '').toString().trim()
    const directionALabel = (data.directionALabel ?? '').toString().trim()
    const directionBKey = (data.directionBKey ?? '').toString().trim()
    const directionBLabel = (data.directionBLabel ?? '').toString().trim()
    const icon = data.icon !== undefined && data.icon !== null ? data.icon.toString().trim() : null

    if (!code) throw new BadRequestException('维度编码不能为空')
    if (!name) throw new BadRequestException('维度名称不能为空')
    if (!directionAKey || !directionBKey) throw new BadRequestException('两个方向标识不能为空')
    if (!directionALabel || !directionBLabel) throw new BadRequestException('两个方向标签不能为空')
    if (directionAKey === directionBKey) throw new BadRequestException('两个方向标识不能相同')

    return { code, name, directionAKey, directionALabel, directionBKey, directionBLabel, icon }
  }

  private normalizeSort(sort: any): number {
    const n = Number(sort)
    if (!Number.isInteger(n) || n < 1) return 1
    return n
  }
}
