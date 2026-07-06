import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { PersonalityResult } from './entities/PersonalityResult'
import { PersonalityConfigService } from './personality-config.service'

/**
 * 人格测试 - 匹配加分服务
 *
 * 为推荐算法提供「人格匹配权重因子」（0~1），作为推荐排序的加分项而非唯一依据。
 * 策略：
 * - 相似型(similar)：四维度雷达差值越小，匹配度越高
 * - 互补型(complementary)：能量来源维度差值越大越好，其余维度越相近越好
 */
@Injectable()
export class PersonalityMatchService {
  /** 互补策略中作为「相反轴」的维度编码 */
  private static readonly OPPOSITE_DIMENSION = 'energy'

  constructor(
    @InjectRepository(PersonalityResult)
    private readonly resultRepo: Repository<PersonalityResult>,
    private readonly configService: PersonalityConfigService,
  ) {}

  /**
   * 计算当前用户与候选用户列表之间的人格匹配加分。
   * @returns Map<candidateUserId, bonus>，bonus ∈ [0,1]；无结果的用户不出现在 Map 中（即加分 0）
   */
  async getBonusMap(currentUserId: number, candidateUserIds: number[]): Promise<Map<number, number>> {
    const empty = new Map<number, number>()
    if (!currentUserId || candidateUserIds.length === 0) return empty

    const cfg = await this.configService.getConfig()
    if (!cfg.matchWeightEnabled) return empty

    const current = await this.resultRepo.findOne({
      where: { userId: currentUserId, isDeleted: 0 },
    })
    const currentRadar = this.extractRadar(current)
    if (!currentRadar) return empty

    const candidates = await this.resultRepo.find({
      where: { userId: In(candidateUserIds), isDeleted: 0 },
    })

    const map = new Map<number, number>()
    for (const cand of candidates) {
      const radar = this.extractRadar(cand)
      if (!radar) continue
      const bonus =
        cfg.matchStrategy === 'complementary'
          ? this.complementaryScore(currentRadar, radar)
          : this.similarScore(currentRadar, radar)
      map.set(Number(cand.userId), bonus)
    }
    return map
  }

  // ==================== 内部计算 ====================

  private extractRadar(result: PersonalityResult | null | undefined): Record<string, number> | null {
    if (!result || !result.dimensionScores) return null
    const radar = (result.dimensionScores as any).radar
    if (!radar || typeof radar !== 'object') return null
    const keys = Object.keys(radar).filter((k) => Number.isFinite(Number(radar[k])))
    if (keys.length === 0) return null
    return radar
  }

  /** 相似型：1 - 平均归一化差值 */
  private similarScore(a: Record<string, number>, b: Record<string, number>): number {
    const keys = this.commonKeys(a, b)
    if (keys.length === 0) return 0
    let sumDiff = 0
    for (const k of keys) {
      sumDiff += Math.abs(Number(a[k]) - Number(b[k])) / 100
    }
    const avgDiff = sumDiff / keys.length
    return this.clamp01(1 - avgDiff)
  }

  /** 互补型：能量维度差值越大越好，其余维度越相近越好 */
  private complementaryScore(a: Record<string, number>, b: Record<string, number>): number {
    const keys = this.commonKeys(a, b)
    if (keys.length === 0) return 0

    const oppositeKey = keys.includes(PersonalityMatchService.OPPOSITE_DIMENSION)
      ? PersonalityMatchService.OPPOSITE_DIMENSION
      : null

    if (!oppositeKey) {
      // 无可用「相反轴」时退化为相似型，避免异常
      return this.similarScore(a, b)
    }

    const oppositeScore = Math.abs(Number(a[oppositeKey]) - Number(b[oppositeKey])) / 100

    const otherKeys = keys.filter((k) => k !== oppositeKey)
    let otherSim = 1
    if (otherKeys.length > 0) {
      let sum = 0
      for (const k of otherKeys) {
        sum += 1 - Math.abs(Number(a[k]) - Number(b[k])) / 100
      }
      otherSim = sum / otherKeys.length
    }

    return this.clamp01(0.4 * oppositeScore + 0.6 * otherSim)
  }

  private commonKeys(a: Record<string, number>, b: Record<string, number>): string[] {
    return Object.keys(a).filter(
      (k) => k in b && Number.isFinite(Number(a[k])) && Number.isFinite(Number(b[k])),
    )
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0
    return Math.min(1, Math.max(0, n))
  }
}
