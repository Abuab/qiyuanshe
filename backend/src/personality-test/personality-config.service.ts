import { Injectable } from '@nestjs/common'
import { SystemService } from '../system/system.service'

/** 推荐匹配策略 */
export type MatchStrategy = 'similar' | 'complementary'

/** 人格测试运行时配置 */
export interface PersonalityConfig {
  /** 每次抽取的题目数量 */
  questionCount: number
  /** 最小答题时长（秒），低于视为异常 */
  minDurationSeconds: number
  /** 游客每日答题次数上限 */
  guestDailyLimit: number
  /** 同一 IP 每小时创建游客 token 上限 */
  guestIpHourlyLimit: number
  /** 登录用户每日重测次数上限 */
  retestDailyLimit: number
  /** 游客 token 有效期（小时） */
  guestTokenTtlHours: number
  /** 推荐匹配策略：相似型 / 互补型 */
  matchStrategy: MatchStrategy
  /** 是否启用人格匹配权重因子 */
  matchWeightEnabled: boolean
}

const DEFAULTS: PersonalityConfig = {
  questionCount: 12,
  minDurationSeconds: 30,
  guestDailyLimit: 3,
  guestIpHourlyLimit: 10,
  retestDailyLimit: 3,
  guestTokenTtlHours: 24,
  matchStrategy: 'similar',
  matchWeightEnabled: true,
}

/**
 * 人格测试配置服务
 *
 * 统一从 system_configs（personality.* 前缀）读取，缺省时回退默认值。
 * 后台可通过系统配置接口写入这些键覆盖默认值。
 */
@Injectable()
export class PersonalityConfigService {
  /** 进程内短缓存，降低推荐等热路径对 system_configs 的读压力 */
  private cache: { value: PersonalityConfig; expireAt: number } | null = null
  private static readonly CACHE_TTL_MS = 30_000

  constructor(private readonly systemService: SystemService) {}

  async getConfig(): Promise<PersonalityConfig> {
    if (this.cache && this.cache.expireAt > Date.now()) {
      return this.cache.value
    }
    const value = await this.loadConfig()
    this.cache = { value, expireAt: Date.now() + PersonalityConfigService.CACHE_TTL_MS }
    return value
  }

  private async loadConfig(): Promise<PersonalityConfig> {
    const [
      questionCount,
      minDurationSeconds,
      guestDailyLimit,
      guestIpHourlyLimit,
      retestDailyLimit,
      guestTokenTtlHours,
      matchStrategy,
      matchWeightEnabled,
    ] = await Promise.all([
      this.getInt('personality.questionCount', DEFAULTS.questionCount, 1, 100),
      this.getInt('personality.minDurationSeconds', DEFAULTS.minDurationSeconds, 0, 3600),
      this.getInt('personality.guestDailyLimit', DEFAULTS.guestDailyLimit, 1, 1000),
      this.getInt('personality.guestIpHourlyLimit', DEFAULTS.guestIpHourlyLimit, 1, 10000),
      this.getInt('personality.retestDailyLimit', DEFAULTS.retestDailyLimit, 1, 1000),
      this.getInt('personality.guestTokenTtlHours', DEFAULTS.guestTokenTtlHours, 1, 720),
      this.getStrategy(),
      this.getBool('personality.matchWeightEnabled', DEFAULTS.matchWeightEnabled),
    ])

    return {
      questionCount,
      minDurationSeconds,
      guestDailyLimit,
      guestIpHourlyLimit,
      retestDailyLimit,
      guestTokenTtlHours,
      matchStrategy,
      matchWeightEnabled,
    }
  }

  private async getInt(key: string, fallback: number, min: number, max: number): Promise<number> {
    const raw = await this.safeGet(key)
    if (raw === null) return fallback
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }

  private async getBool(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.safeGet(key)
    if (raw === null) return fallback
    return raw !== 'false' && raw !== '0'
  }

  private async getStrategy(): Promise<MatchStrategy> {
    const raw = await this.safeGet('personality.matchStrategy')
    return raw === 'complementary' ? 'complementary' : 'similar'
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.systemService.getConfig(key)
    } catch {
      return null
    }
  }
}
