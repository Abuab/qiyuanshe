import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderConfigService } from './ai-provider-config.service'
import { encryptApiKey } from './ai-crypto.util'

/** 占位 Key 关键词（包含这些词的 Key 视为无效，不会入库） */
const PLACEHOLDER_PATTERNS = [
  '你的deepseek', '你的kimi', '你的openai', '你的qwen', '你的ernie',
  'sk-your-', 'your-api-key', '填入',
]

function isPlaceholderKey(key: string): boolean {
  if (!key || key.length < 10) return true
  return PLACEHOLDER_PATTERNS.some(p => key.toLowerCase().includes(p.toLowerCase()))
}

/**
 * 系统启动时，将 .env 中的 Provider 配置同步到数据库
 *
 * - 自动重试（最多 5 次，间隔 2 秒），应对 TypeORM synchronize 延迟
 * - 跳过占位 Key（如 "你的deepseek-key"）
 * - 管理后台可通过 POST /seed-from-env 手动触发
 */
@Injectable()
export class AiProviderSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiProviderSeeder.name)
  private seeded = false

  /** 从 .env 读取的 Provider 定义列表 */
  private static PROVIDER_DEFS = [
    { envPrefix: 'DEEPSEEK', providerKey: 'deepseek', displayName: 'DeepSeek' },
    { envPrefix: 'KIMI',     providerKey: 'kimi',     displayName: 'Kimi (月之暗面)' },
    { envPrefix: 'OPENAI',   providerKey: 'openai',   displayName: 'OpenAI' },
    { envPrefix: 'QWEN',     providerKey: 'qwen',     displayName: '通义千问' },
    { envPrefix: 'ERNIE',    providerKey: 'ernie',    displayName: '文心一言' },
  ]

  constructor(
    @InjectRepository(AiProviderConfig)
    private readonly configRepo: Repository<AiProviderConfig>,
    private readonly configService: AiProviderConfigService,
  ) {}

  async onApplicationBootstrap() {
    // 尝试自动同步，最多重试 5 次
    for (let i = 0; i < 5; i++) {
      try {
        const result = await this.seedFromEnv()
        this.seeded = true
        this.logger.log(`[Seeder] 启动时自动同步完成: ${result.message}`)
        return
      } catch (e: any) {
        this.logger.warn(`[Seeder] 第 ${i + 1}/5 次自动同步失败: ${e?.message}，2秒后重试...`)
        await this.delay(2000)
      }
    }
    this.logger.warn('[Seeder] 5 次自动同步均失败。请在管理后台点击「从 .env 同步」手动触发。')
  }

  /** 公开方法：管理后台可调用此方法手动从 .env 同步 */
  async seedFromEnv(): Promise<{ created: number; skipped: number; message: string }> {
    let created = 0
    let skipped = 0
    const errors: string[] = []

    this.logger.log(`[Seeder] 开始扫描 .env 中的 Provider 配置...`)
    this.logger.log(`[Seeder] DEEPSEEK_ENABLED=${process.env.DEEPSEEK_ENABLED}, KEY=${process.env.DEEPSEEK_API_KEY ? '***已配置' : '(空)'}`)
    this.logger.log(`[Seeder] KIMI_ENABLED=${process.env.KIMI_ENABLED}, KEY=${process.env.KIMI_API_KEY ? '***已配置' : '(空)'}`)

    for (const def of AiProviderSeeder.PROVIDER_DEFS) {
      try {
        const enabled = process.env[`${def.envPrefix}_ENABLED`]?.toLowerCase() === 'true'
        const apiKey = process.env[`${def.envPrefix}_API_KEY`] || ''

        if (!enabled && !apiKey) {
          continue
        }

        // 检查是否已存在
        const existing = await this.configRepo.findOne({
          where: { providerKey: def.providerKey, isDeleted: 0 },
        })

        if (existing) {
          // 已存在：更新 Key（如果 .env 有效）、Base、Model、启用状态
          if (apiKey && !isPlaceholderKey(apiKey)) {
            existing.apiKeyEncrypted = encryptApiKey(apiKey)
          }
          const apiBase = process.env[`${def.envPrefix}_API_BASE`]
          if (apiBase) existing.apiBase = apiBase
          const modelName = process.env[`${def.envPrefix}_MODEL_NAME`]
          if (modelName) existing.modelName = modelName
          existing.isEnabled = enabled ? 1 : 0
          await this.configRepo.save(existing)
          skipped++
          this.logger.log(`[Seeder] 已更新 Provider: ${def.displayName} (enabled=${enabled})`)
          continue
        }

        // 不存在 → 创建
        const apiBase = process.env[`${def.envPrefix}_API_BASE`] || ''
        const modelName = process.env[`${def.envPrefix}_MODEL_NAME`] || ''

        if (!apiKey || !apiBase || !modelName) {
          this.logger.debug(`[Seeder] ${def.displayName} 配置不完整，跳过`)
          continue
        }

        if (isPlaceholderKey(apiKey)) {
          this.logger.warn(`[Seeder] ${def.displayName} 使用占位 Key，跳过。请在 .env 中填入真实 Key。`)
          continue
        }

        const weight = parseInt(process.env[`${def.envPrefix}_WEIGHT`] || '10', 10)
        const priority = parseInt(process.env[`${def.envPrefix}_PRIORITY`] || '100', 10)
        const balanceUrl = process.env[`${def.envPrefix}_BALANCE_URL`] || null
        const isDefault = process.env.AI_DEFAULT_PROVIDER === def.providerKey

        const cfg = this.configRepo.create({
          providerKey: def.providerKey,
          displayName: def.displayName,
          apiKeyEncrypted: encryptApiKey(apiKey),
          apiBase,
          modelName,
          isEnabled: enabled ? 1 : 0,
          isDefault: isDefault ? 1 : 0,
          weight,
          priority,
          balanceQueryUrl: balanceUrl,
        })
        await this.configRepo.save(cfg)
        created++
        this.logger.log(`[Seeder] 已创建 Provider: ${def.displayName} (${modelName}, enabled=${enabled})`)
      } catch (e: any) {
        const msg = `${def.displayName}: ${e?.message}`
        errors.push(msg)
        this.logger.error(`[Seeder] ${msg}`)
      }
    }

    const summary = created > 0 || skipped > 0
      ? `Provider 同步完成：新建 ${created}，更新 ${skipped}`
      : `没有新的 Provider 需要同步。请检查 .env 中是否配置了真实的 API Key（不是占位值）。`

    if (errors.length > 0) {
      this.logger.error(`[Seeder] ${summary}，${errors.length} 个错误: ${errors.join('; ')}`)
    } else {
      this.logger.log(`[Seeder] ${summary}`)
    }

    if (created > 0 || skipped > 0) {
      try {
        await this.configService.syncToRedis()
      } catch (e: any) {
        this.logger.error(`[Seeder] Redis 同步失败: ${e?.message}`)
      }
    }

    return { created, skipped, message: summary }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
