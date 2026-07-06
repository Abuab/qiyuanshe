import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopySlot, CopyDisplayMode } from './entities/CopySlot'
import { CopyItem } from './entities/CopyItem'

const VALID_MODES: CopyDisplayMode[] = ['carousel', 'ab_test', 'all']
const CODE_PATTERN = /^[a-z][a-z0-9_]{1,49}$/

/**
 * 文案位管理服务
 */
@Injectable()
export class CopySlotService {
  constructor(
    @InjectRepository(CopySlot)
    private readonly slotRepo: Repository<CopySlot>,
    @InjectRepository(CopyItem)
    private readonly itemRepo: Repository<CopyItem>,
  ) {}

  /** 后台列表：返回所有文案位（含每个文案位下的文案条数） */
  async getAdminList(): Promise<any[]> {
    const slots = await this.slotRepo.find({ order: { sort: 'ASC', id: 'ASC' } })
    const result: any[] = []
    for (const slot of slots) {
      const itemCount = await this.itemRepo.count({ where: { slotId: slot.id } })
      result.push({ ...slot, itemCount })
    }
    return result
  }

  async getById(id: number): Promise<CopySlot> {
    const slot = await this.slotRepo.findOne({ where: { id } })
    if (!slot) throw new NotFoundException('文案位不存在')
    return slot
  }

  async getByCode(code: string): Promise<CopySlot | null> {
    return this.slotRepo.findOne({ where: { code } })
  }

  async create(body: any): Promise<CopySlot> {
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException('文案位编码需以小写字母开头，仅含小写字母/数字/下划线，长度2-50')
    }
    const exists = await this.slotRepo.findOne({ where: { code } })
    if (exists) throw new BadRequestException('文案位编码已存在')

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) throw new BadRequestException('文案位名称不能为空')

    const slot = this.slotRepo.create({
      code,
      name,
      pageLocation: this.trimOrNull(body?.pageLocation),
      remark: this.trimOrNull(body?.remark),
      displayMode: this.normalizeMode(body?.displayMode),
      isSystem: 0,
      isEnabled: body?.isEnabled === 0 ? 0 : 1,
      sort: this.normalizeSort(body?.sort),
    })
    return this.slotRepo.save(slot)
  }

  async update(id: number, body: any): Promise<CopySlot> {
    const slot = await this.getById(id)
    // 编码不可修改：忽略 body.code
    if (body?.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) throw new BadRequestException('文案位名称不能为空')
      slot.name = name
    }
    if (body?.pageLocation !== undefined) slot.pageLocation = this.trimOrNull(body.pageLocation)
    if (body?.remark !== undefined) slot.remark = this.trimOrNull(body.remark)
    if (body?.displayMode !== undefined) slot.displayMode = this.normalizeMode(body.displayMode)
    if (body?.isEnabled !== undefined) slot.isEnabled = body.isEnabled === 0 ? 0 : 1
    if (body?.sort !== undefined) slot.sort = this.normalizeSort(body.sort)
    return this.slotRepo.save(slot)
  }

  async remove(id: number): Promise<void> {
    const slot = await this.getById(id)
    if (slot.isSystem === 1) {
      throw new BadRequestException('系统预置文案位不可删除')
    }
    // 一并删除其下文案
    await this.itemRepo.delete({ slotId: id })
    await this.slotRepo.delete(id)
  }

  private normalizeMode(mode: any): CopyDisplayMode {
    return VALID_MODES.includes(mode) ? mode : 'carousel'
  }

  private normalizeSort(sort: any): number {
    const n = parseInt(sort, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  private trimOrNull(v: any): string | null {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t ? t : null
  }
}
