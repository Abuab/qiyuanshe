import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { RedisService } from '../common/redis.service'
import {
  AiFeatureKey,
  AiFeatureConfig,
  AiFeatureSwitch,
  AiFeaturePublicConfig,
  AI_MASTER_KEY,
  AI_FEATURE_KEYS,
  ALL_AI_KEYS,
  AI_CONFIG_CACHE_KEY,
} from './types'

/** 子功能标签 */
const FEATURE_LABELS: Record<AiFeatureKey, string> = {
  [AiFeatureKey.MATCH]: 'AI缘分匹配分析',
  [AiFeatureKey.CHAT_SKILL]: 'AI聊天话术助手',
  [AiFeatureKey.MATCHMAKER]: 'AI红娘机器人',
  [AiFeatureKey.FUN_QUIZ]: 'AI趣味缘分测试',
  [AiFeatureKey.PROFILE_GEN]: 'AI个人印象生成',
  [AiFeatureKey.AI_ASSISTANT]: 'AI助手入口（小程序金刚区）',
}

const FEATURE_KEY_NAMES: Record<AiFeatureKey, string> = {
  [AiFeatureKey.MATCH]: 'match',
  [AiFeatureKey.CHAT_SKILL]: 'chat_skill',
  [AiFeatureKey.MATCHMAKER]: 'matchmaker',
  [AiFeatureKey.FUN_QUIZ]: 'fun_quiz',
  [AiFeatureKey.PROFILE_GEN]: 'profile_gen',
  [AiFeatureKey.AI_ASSISTANT]: 'ai_assistant',
}

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AiFeatureSwitchLog)
    private readonly logRepo: Repository<AiFeatureSwitchLog>,
    private readonly redis: RedisService,
  ) {}

  // ==================== 管理后台：获取完整开关配置 ====================

  async getAdminConfig(): Promise<{
    master: AiFeatureSwitch
    features: AiFeatureSwitch[]
  }> {
    const allConfigs = await this.configRepo.find()
    const map = new Map<string, { value: string; updatedAt: string }>()
    allConfigs.forEach((c) => {
      map.set(c.configKey, {
        value: c.configValue || '1',
        updatedAt: c.updatedAt?.toISOString?.() || new Date().toISOString(),
      })
    })

    const getBool = (key: string) => map.get(key)?.value !== '0'
    const getTime = (key: string) => map.get(key)?.updatedAt || new Date().toISOString()

    const masterEnabled = getBool(AI_MASTER_KEY)

    const masterSwitch: AiFeatureSwitch = {
      key: 'master',
      label: 'AI功能总控',
      keyName: 'master',
      enabled: masterEnabled,
      lastModifiedAt: getTime(AI_MASTER_KEY),
    }

    const features: AiFeatureSwitch[] = Object.entries(AI_FEATURE_KEYS).map(([key, dbKey]) => ({
      key: key as AiFeatureKey,
      label: FEATURE_LABELS[key as AiFeatureKey] || key,
      keyName: FEATURE_KEY_NAMES[key as AiFeatureKey] || key,
      enabled: getBool(dbKey),
      lastModifiedAt: getTime(dbKey),
    }))

    return { master: masterSwitch, features }
  }

  // ==================== 小程序端：获取公开配置（Redis 缓存） ====================

  async getPublicConfig(): Promise<AiFeaturePublicConfig> {
    // 先查 Redis 缓存
    const cached = await this.redis.get(AI_CONFIG_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        // 缓存损坏，继续查 DB
      }
    }

    // 查 DB
    const config = await this.loadFromDb()

    // 写入 Redis 缓存（5分钟过期）
    await this.redis.set(AI_CONFIG_CACHE_KEY, JSON.stringify(config), 300)

    return config
  }

  // ==================== 管理后台：更新开关 ====================

  async updateSwitch(
    configKey: string,
    enabled: boolean,
    operatorId: number | null,
    ipAddress: string,
  ): Promise<void> {
    const newValue = enabled ? '1' : '0'

    // 1. 获取旧值
    const existing = await this.configRepo.findOne({ where: { configKey } })
    const oldValue = existing?.configValue || '1'

    // 2. 更新配置
    if (existing) {
      existing.configValue = newValue
      await this.configRepo.save(existing)
    } else {
      const entry = this.configRepo.create({
        configKey,
        configValue: newValue,
        description: `AI功能开关: ${configKey}`,
      })
      await this.configRepo.save(entry)
    }

    // 3. 清除 Redis 缓存
    await this.redis.del(AI_CONFIG_CACHE_KEY)

    // 4. 写入操作日志
    const log = this.logRepo.create({
      featureKey: configKey,
      oldValue,
      newValue,
      operatorId,
      ipAddress,
    })
    await this.logRepo.save(log)

    this.logger.log(
      `[AI Switch] ${configKey}: ${oldValue} → ${newValue} by operator ${operatorId}`,
    )
  }

  // ==================== 获取操作日志 ====================

  async getSwitchLogs(page = 1, limit = 20) {
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['operator'],
    })

    return {
      items: items.map((log) => ({
        id: log.id,
        featureKey: log.featureKey,
        oldValue: log.oldValue,
        newValue: log.newValue,
        operatorId: log.operatorId,
        operatorName: log.operator?.nickname || '未知',
        ipAddress: log.ipAddress,
        createdAt: log.createdAt?.toISOString?.() || new Date().toISOString(),
      })),
      total,
      page,
      limit,
    }
  }

  // ==================== 校验功能是否开启 ====================

  /**
   * 校验指定 AI 功能是否可用
   * 返回 true=可用，false=功能被关闭
   */
  async isFeatureEnabled(featureKey: AiFeatureKey): Promise<boolean> {
    const config = await this.getPublicConfig()
    if (!config.masterEnabled) return false
    return config.features[featureKey] === true
  }

  // ==================== 内部方法 ====================

  private async loadFromDb(): Promise<AiFeaturePublicConfig> {
    const allConfigs = await this.configRepo.find()
    const map = new Map<string, string>()
    allConfigs.forEach((c) => {
      map.set(c.configKey, c.configValue || '1')
    })

    const getBool = (key: string) => map.get(key) !== '0'

    const masterEnabled = getBool(AI_MASTER_KEY)

    const features: Record<AiFeatureKey, boolean> = {} as Record<AiFeatureKey, boolean>
    for (const key of Object.values(AiFeatureKey)) {
      // 子功能生效条件：总开关开启 AND 子开关开启
      features[key] = masterEnabled && getBool(AI_FEATURE_KEYS[key])
    }

    return { masterEnabled, features }
  }
}
