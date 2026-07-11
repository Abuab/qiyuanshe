import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'

/**
 * 各功能的免费/VIP 限额配置
 */
export interface QuotaConfig {
  chat: {
    freePerMatch: number     // 非会员：相互喜欢后免费消息数
    vipPerDay: number         // 会员：每日消息数
  }
  matchmaker: {
    freePerDay: number
    vipPerDay: number
  }
  impression: {
    freePerWeek: number
    vipPerDay: number
  }
  emotion: {
    freePerDay: number
    vipPerDay: number
  }
  match: {
    freePerDay: number
    vipPerDay: number
  }
  quiz: {
    freePerDay: number
    vipPerDay: number
  }
  /** AI 情感问答（聊天）每日对话条数 */
  emotionQa: {
    freePerDay: number
    vipPerDay: number
  }
}

/** 默认限额（写死在代码中，数据库无配置时使用） */
const DEFAULT_QUOTA: QuotaConfig = {
  chat:        { freePerMatch: 2,  vipPerDay: 10 },
  matchmaker:  { freePerDay: 3,   vipPerDay: 10 },
  impression:  { freePerWeek: 1,  vipPerDay: 1 },
  emotion:     { freePerDay: 3,   vipPerDay: 10 },
  match:       { freePerDay: 2,   vipPerDay: 10 },
  quiz:        { freePerDay: 2,   vipPerDay: 10 },
  emotionQa:   { freePerDay: 5,   vipPerDay: 30 },
}

/** system_configs 中的 configKey 前缀 */
const QUOTA_PREFIX = 'quota.'

/**
 * 从 system_configs 表中读取各功能的免费/VIP 限额配置。
 * 管理后台可随时修改，无需重启。
 */
@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name)

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  /**
   * 获取完整配额配置（优先读数据库，回退默认值）
   */
  async getConfig(): Promise<QuotaConfig> {
    try {
      const rows = await this.configRepo.find()
      if (!rows.length) return { ...DEFAULT_QUOTA }

      const map: Record<string, string> = {}
      rows.forEach(r => { map[r.configKey] = r.configValue })

      const getNum = (key: string, fallback: number): number => {
        const val = map[QUOTA_PREFIX + key]
        if (val != null) {
          const n = parseInt(val, 10)
          if (!isNaN(n) && n >= 0) return n
        }
        return fallback
      }

      return {
        chat: {
          freePerMatch: getNum('chat.freePerMatch', DEFAULT_QUOTA.chat.freePerMatch),
          vipPerDay:    getNum('chat.vipPerDay',    DEFAULT_QUOTA.chat.vipPerDay),
        },
        matchmaker: {
          freePerDay: getNum('matchmaker.freePerDay', DEFAULT_QUOTA.matchmaker.freePerDay),
          vipPerDay:  getNum('matchmaker.vipPerDay',  DEFAULT_QUOTA.matchmaker.vipPerDay),
        },
        impression: {
          freePerWeek: getNum('impression.freePerWeek', DEFAULT_QUOTA.impression.freePerWeek),
          vipPerDay:   getNum('impression.vipPerDay',   DEFAULT_QUOTA.impression.vipPerDay),
        },
        emotion: {
          freePerDay: getNum('emotion.freePerDay', DEFAULT_QUOTA.emotion.freePerDay),
          vipPerDay:  getNum('emotion.vipPerDay',  DEFAULT_QUOTA.emotion.vipPerDay),
        },
        match: {
          freePerDay: getNum('match.freePerDay', DEFAULT_QUOTA.match.freePerDay),
          vipPerDay:  getNum('match.vipPerDay',  DEFAULT_QUOTA.match.vipPerDay),
        },
        quiz: {
          freePerDay: getNum('quiz.freePerDay', DEFAULT_QUOTA.quiz.freePerDay),
          vipPerDay:  getNum('quiz.vipPerDay',  DEFAULT_QUOTA.quiz.vipPerDay),
        },
        emotionQa: {
          freePerDay: getNum('emotionQa.freePerDay', DEFAULT_QUOTA.emotionQa.freePerDay),
          vipPerDay:  getNum('emotionQa.vipPerDay',  DEFAULT_QUOTA.emotionQa.vipPerDay),
        },
      }
    } catch (e: any) {
      this.logger.warn(`读取配额配置失败，使用默认值: ${e?.message}`)
      return { ...DEFAULT_QUOTA }
    }
  }

  /**
   * 保存配额配置到数据库
   */
  async saveConfig(config: QuotaConfig): Promise<void> {
    const entries: Array<{ key: string; value: number }> = [
      { key: 'chat.freePerMatch',  value: config.chat.freePerMatch },
      { key: 'chat.vipPerDay',     value: config.chat.vipPerDay },
      { key: 'matchmaker.freePerDay', value: config.matchmaker.freePerDay },
      { key: 'matchmaker.vipPerDay',  value: config.matchmaker.vipPerDay },
      { key: 'impression.freePerWeek', value: config.impression.freePerWeek },
      { key: 'impression.vipPerDay',   value: config.impression.vipPerDay },
      { key: 'emotion.freePerDay', value: config.emotion.freePerDay },
      { key: 'emotion.vipPerDay',  value: config.emotion.vipPerDay },
      { key: 'match.freePerDay', value: config.match.freePerDay },
      { key: 'match.vipPerDay',  value: config.match.vipPerDay },
      { key: 'quiz.freePerDay', value: config.quiz.freePerDay },
      { key: 'quiz.vipPerDay',  value: config.quiz.vipPerDay },
      { key: 'emotionQa.freePerDay', value: config.emotionQa.freePerDay },
      { key: 'emotionQa.vipPerDay',  value: config.emotionQa.vipPerDay },
    ]

    for (const { key, value } of entries) {
      const configKey = QUOTA_PREFIX + key
      let row = await this.configRepo.findOne({ where: { configKey } })
      if (row) {
        row.configValue = String(value)
        await this.configRepo.save(row)
      } else {
        row = this.configRepo.create({
          configKey,
          configValue: String(value),
          description: `用量限额: ${key}`,
        })
        await this.configRepo.save(row)
      }
    }
    this.logger.log('配额配置已保存')
  }
}
