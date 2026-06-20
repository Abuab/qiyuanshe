import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderConfigService } from './ai-provider-config.service'
import { encryptApiKey } from './ai-crypto.util'

/**
 * 系统启动时，将 .env 中的 Provider 配置同步到数据库
 *
 * 规则：DB 中已存在 providerKey → 更新；不存在 → 创建
 * 之后通过管理后台 CRUD 管理
 */
@Injectable()
export class AiProviderSeeder implements OnModuleInit {
  private readonly logger = new Logger(AiProviderSeeder.name)

  /** 从 .env 读取的 Provider 定义列表 */
  private static PROVIDER_DEFS = [
    {
      envPrefix: 'DEEPSEEK',
      providerKey: 'deepseek',
      displayName: 'DeepSeek',
      balanceQueryUrl: undefined,
    },
    {
      envPrefix: 'KIMI',
      providerKey: 'kimi',
      displayName: 'Kimi (月之暗面)',
      balanceQueryUrl: undefined,
    },
    {
      envPrefix: 'OPENAI',
      providerKey: 'openai',
      displayName: 'OpenAI',
      balanceQueryUrl: undefined,
    },
    {
      envPrefix: 'QWEN',
      providerKey: 'qwen',
      displayName: '通义千问',
      balanceQueryUrl: undefined,
    },
    {
      envPrefix: 'ERNIE',
      providerKey: 'ernie',
      displayName: '文心一言',
      balanceQueryUrl: undefined,
    },
  ]

  constructor(
    @InjectRepository(AiProviderConfig)
    private readonly configRepo: Repository<AiProviderConfig>,
    private readonly configService: AiProviderConfigService,
  ) {}

  async onModuleInit() {
    // TypeORM synchronize 可能还未完成，延迟 3 秒后重试
    setTimeout(async () => {
      await this.seedFromEnv()
    }, 3000)
  }

  /** 公开方法：管理后台可调用此方法手动从 .env 同步 */
  async seedFromEnv(): Promise<{ created: number; skipped: number; message: string }> {
    let created = 0
    let skipped = 0

    for (const def of AiProviderSeeder.PROVIDER_DEFS) {
      try {
        const enabled = process.env[`${def.envPrefix}_ENABLED`]?.toLowerCase() === 'true'
        const apiKey = process.env[`${def.envPrefix}_API_KEY`]

        if (!enabled && !apiKey) {
          this.logger.debug(`[Seeder] ${def.displayName} 未启用且无 Key，跳过`)
          continue
        }

        // 检查是否已存在
        const existing = await this.configRepo.findOne({
          where: { providerKey: def.providerKey, isDeleted: 0 },
        })

        if (existing) {
          // 已存在：更新 API Key / Base / Model（如果 .env 有内容）
          if (apiKey && apiKey !== '你的deepseek-key' && apiKey !== '你的kimi-key' && apiKey !== 'sk-your-deepseek-key' && apiKey !== 'sk-your-kimi-key') {
            existing.apiKeyEncrypted = encryptApiKey(apiKey)
          }
          const apiBase = process.env[`${def.envPrefix}_API_BASE`]
          if (apiBase) existing.apiBase = apiBase
          const modelName = process.env[`${def.envPrefix}_MODEL_NAME`]
          if (modelName) existing.modelName = modelName
          existing.isEnabled = enabled ? 1 : 0
          await this.configRepo.save(existing)
          skipped++
          this.logger.log(`[Seeder] 已更新 Provider: ${def.displayName}`)
          continue
        }

        // 不存在：创建
        const apiBase = process.env[`${def.envPrefix}_API_BASE`] || ''
        const modelName = process.env[`${def.envPrefix}_MODEL_NAME`] || ''
        const weight = parseInt(process.env[`${def.envPrefix}_WEIGHT`] || '10', 10)
        const priority = parseInt(process.env[`${def.envPrefix}_PRIORITY`] || '100', 10)
        const balanceUrl = process.env[`${def.envPrefix}_BALANCE_URL`] || null

        if (!apiKey || !apiBase || !modelName) {
          this.logger.warn(`[Seeder] Provider ${def.displayName} 配置不完整（需要 API_KEY/API_BASE/MODEL_NAME），跳过`)
          continue
        }

        // 跳过示例/占位 Key
        if (apiKey === '你的deepseek-key' || apiKey === '你的kimi-key' || apiKey === 'sk-your-deepseek-key' || apiKey === 'sk-your-kimi-key') {
          this.logger.warn(`[Seeder] Provider ${def.displayName} 使用示例 Key，跳过创建。请在 .env 中填入真实 Key。`)
          continue
        }

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
        this.logger.log(`[Seeder] 已创建 Provider: ${def.displayName} (${modelName})`)
      } catch (e: any) {
        this.logger.error(`[Seeder] 处理 ${def.displayName} 失败: ${e?.message}`, e?.stack)
      }
    }

    const summary = created > 0 || skipped > 0
      ? `Provider 同步完成：新建 ${created}，更新 ${skipped}`
      : `没有新的 Provider 需要同步（已全部入库或无有效 .env 配置）`

    this.logger.log(`[Seeder] ${summary}`)

    if (created > 0 || skipped > 0) {
      try {
        await this.configService.syncToRedis()
      } catch (e: any) {
        this.logger.error(`[Seeder] Redis 同步失败: ${e?.message}`)
      }
    }

    return { created, skipped, message: summary }
  }
}
