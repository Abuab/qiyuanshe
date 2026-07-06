import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopySlot } from './entities/CopySlot'
import { CopyItem } from './entities/CopyItem'
import { User } from '../entities/User'
import { PersonalityResult } from '../personality-test/entities/PersonalityResult'

/** 受众上下文（服务端权威推导，避免前端伪造定向） */
export interface AudienceContext {
  isLoggedIn: boolean
  gender: number // 0 未知 / 1 男 / 2 女
  tested: boolean
  /** 去重与 A/B 分组用的稳定标识：登录 u:{id} / 游客 v:{visitorId} / 匿名 null */
  userKey: string | null
}

export interface ResolvedCopyItem {
  id: number
  mainText: string
  subText: string | null
}

export interface ResolvedCopy {
  slotCode: string
  mode: CopySlot['displayMode']
  items: ResolvedCopyItem[]
}

/**
 * 文案解析服务：根据用户身份 + 文案位展示模式，返回当前应展示的文案。
 */
@Injectable()
export class CopyResolveService {
  constructor(
    @InjectRepository(CopySlot)
    private readonly slotRepo: Repository<CopySlot>,
    @InjectRepository(CopyItem)
    private readonly itemRepo: Repository<CopyItem>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PersonalityResult)
    private readonly resultRepo: Repository<PersonalityResult>,
  ) {}

  /** 构建受众上下文 */
  async buildContext(userId?: number, visitorId?: string): Promise<AudienceContext> {
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } as any })
      const tested = await this.resultRepo.count({ where: { userId, isDeleted: 0 } })
      return {
        isLoggedIn: true,
        gender: user?.gender ?? 0,
        tested: tested > 0,
        userKey: `u:${userId}`,
      }
    }
    return {
      isLoggedIn: false,
      gender: 0,
      tested: false,
      userKey: visitorId ? `v:${visitorId}` : null,
    }
  }

  /** 解析某文案位当前展示文案 */
  async resolve(slotCode: string, ctx: AudienceContext): Promise<ResolvedCopy> {
    const slot = await this.slotRepo.findOne({ where: { code: slotCode } })
    if (!slot || slot.isEnabled !== 1) {
      return { slotCode, mode: 'carousel', items: [] }
    }

    const enabled = await this.itemRepo.find({
      where: { slotId: slot.id, isEnabled: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const matched = enabled.filter((it) => this.matchTargeting(it, ctx))
    if (matched.length === 0) {
      return { slotCode, mode: slot.displayMode, items: [] }
    }

    let chosen: CopyItem[]
    switch (slot.displayMode) {
      case 'all':
        chosen = matched
        break
      case 'ab_test':
        chosen = [this.pickForAbTest(matched, ctx, slot.code)]
        break
      case 'carousel':
      default:
        chosen = [this.pickByWeight(matched)]
        break
    }

    return {
      slotCode,
      mode: slot.displayMode,
      items: chosen.map((it) => ({ id: it.id, mainText: it.mainText, subText: it.subText })),
    }
  }

  /** 定向过滤：各维度「与」关系，未设置维度不限 */
  private matchTargeting(item: CopyItem, ctx: AudienceContext): boolean {
    if (item.targetLoginState === 'guest' && ctx.isLoggedIn) return false
    if (item.targetLoginState === 'logged' && !ctx.isLoggedIn) return false
    if (item.targetGender != null && item.targetGender !== ctx.gender) return false
    if (item.targetTested != null && item.targetTested === 1 !== ctx.tested) return false
    return true
  }

  /** 轮播：按权重概率抽取一条 */
  private pickByWeight(items: CopyItem[]): CopyItem {
    const total = items.reduce((sum, it) => sum + this.clampWeight(it.weight), 0)
    let r = Math.random() * total
    for (const it of items) {
      r -= this.clampWeight(it.weight)
      if (r <= 0) return it
    }
    return items[items.length - 1]
  }

  /**
   * A/B 测试：按用户稳定分桶，保证——
   * 1. 同一用户始终命中同一条（干净的转化归因）；
   * 2. 用户群体在各文案间近似均分（哈希均匀分布）。
   * 匿名无 userKey 时退化为随机，避免恒定命中同一条。
   */
  private pickForAbTest(items: CopyItem[], ctx: AudienceContext, slotCode: string): CopyItem {
    if (!ctx.userKey) {
      return items[Math.floor(Math.random() * items.length)]
    }
    const idx = this.hashString(`${ctx.userKey}|${slotCode}`) % items.length
    return items[idx]
  }

  private clampWeight(w: number): number {
    if (!Number.isFinite(w)) return 1
    return Math.min(100, Math.max(1, w))
  }

  /** 稳定的非负 32 位哈希（djb2 变体） */
  private hashString(s: string): number {
    let hash = 5381
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
  }
}
