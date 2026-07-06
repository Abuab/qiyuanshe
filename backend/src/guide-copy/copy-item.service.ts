import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopyItem } from './entities/CopyItem'
import { CopySlot } from './entities/CopySlot'

/**
 * 文案条目管理服务
 */
@Injectable()
export class CopyItemService {
  constructor(
    @InjectRepository(CopyItem)
    private readonly itemRepo: Repository<CopyItem>,
    @InjectRepository(CopySlot)
    private readonly slotRepo: Repository<CopySlot>,
  ) {}

  async listBySlot(slotId: number): Promise<CopyItem[]> {
    return this.itemRepo.find({
      where: { slotId },
      order: { sort: 'ASC', id: 'ASC' },
    })
  }

  async create(body: any): Promise<CopyItem> {
    const slotId = parseInt(body?.slotId, 10)
    if (!Number.isFinite(slotId)) throw new BadRequestException('缺少所属文案位')
    const slot = await this.slotRepo.findOne({ where: { id: slotId } })
    if (!slot) throw new BadRequestException('所属文案位不存在')

    const item = this.itemRepo.create({
      slotId,
      mainText: this.requireText(body?.mainText, '主文案'),
      subText: this.optionalText(body?.subText),
      weight: this.normalizeWeight(body?.weight),
      ...this.normalizeTargeting(body),
      isEnabled: body?.isEnabled === 0 ? 0 : 1,
      sort: this.normalizeSort(body?.sort),
    })
    return this.itemRepo.save(item)
  }

  async update(id: number, body: any): Promise<CopyItem> {
    const item = await this.getById(id)
    if (body?.mainText !== undefined) item.mainText = this.requireText(body.mainText, '主文案')
    if (body?.subText !== undefined) item.subText = this.optionalText(body.subText)
    if (body?.weight !== undefined) item.weight = this.normalizeWeight(body.weight)
    if (body?.isEnabled !== undefined) item.isEnabled = body.isEnabled === 0 ? 0 : 1
    if (body?.sort !== undefined) item.sort = this.normalizeSort(body.sort)
    if (
      body?.targetLoginState !== undefined ||
      body?.targetGender !== undefined ||
      body?.targetTested !== undefined
    ) {
      const t = this.normalizeTargeting(body)
      item.targetLoginState = t.targetLoginState
      item.targetGender = t.targetGender
      item.targetTested = t.targetTested
    }
    return this.itemRepo.save(item)
  }

  async setEnabled(id: number, isEnabled: any): Promise<void> {
    const item = await this.getById(id)
    item.isEnabled = isEnabled === 0 || isEnabled === false ? 0 : 1
    await this.itemRepo.save(item)
  }

  async remove(id: number): Promise<void> {
    await this.getById(id)
    await this.itemRepo.delete(id)
  }

  private async getById(id: number): Promise<CopyItem> {
    const item = await this.itemRepo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('文案不存在')
    return item
  }

  private requireText(v: any, label: string): string {
    const t = typeof v === 'string' ? v.trim() : ''
    if (!t) throw new BadRequestException(`${label}不能为空`)
    if (t.length > 255) throw new BadRequestException(`${label}长度不能超过255`)
    return t
  }

  private optionalText(v: any): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    if (!t) return null
    if (t.length > 255) throw new BadRequestException('副文案长度不能超过255')
    return t
  }

  private normalizeWeight(v: any): number {
    const n = parseInt(v, 10)
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      throw new BadRequestException('权重需为 1-100 的整数')
    }
    return n
  }

  private normalizeSort(v: any): number {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  /** 归一化定向条件：空串/未传视为不限（null） */
  private normalizeTargeting(body: any): {
    targetLoginState: string | null
    targetGender: number | null
    targetTested: number | null
  } {
    let loginState: string | null = null
    if (body?.targetLoginState === 'guest' || body?.targetLoginState === 'logged') {
      loginState = body.targetLoginState
    }
    let gender: number | null = null
    if (body?.targetGender === 1 || body?.targetGender === 2 || body?.targetGender === '1' || body?.targetGender === '2') {
      gender = parseInt(body.targetGender, 10)
    }
    let tested: number | null = null
    if (body?.targetTested === 1 || body?.targetTested === 0 || body?.targetTested === '1' || body?.targetTested === '0') {
      tested = parseInt(body.targetTested, 10)
    }
    return { targetLoginState: loginState, targetGender: gender, targetTested: tested }
  }
}
