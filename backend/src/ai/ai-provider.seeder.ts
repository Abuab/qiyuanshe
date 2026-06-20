import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderConfigService } from './ai-provider-config.service'
import { encryptApiKey } from './ai-crypto.util'

/**
 * 系统启动时，将 .env 中的 Provider 配置同步到数据库
 *
 * - 启动时自动执行（OnApplicationBootstrap，所有模块就绪后触发）
 * - 管理后台可通过 POST /admin/ai/provider/seed-from-env 手动触发
 * - 不做 Key 有效性校验，信任 .env 配置；Key 无效时 AI 调用会自然报错
 */
@Injectable()
export class AiProviderSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiProviderSeeder.name)

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

  /** 应用启动完毕后自动执行 */
  async onApplicationBootstrap() {
    this.logger.log('[Seeder] 应用已启动，准备同步 Provider 配置...')
    try {
      const result = await this.seedFromEnv()
      this.logger.log(`[Seeder] 启动自动同步完成: ${result.message}`)
    } catch (e: any) {
      this.logger.error(`[Seeder] 启动自动同步失败: ${e?.message}，可进入管理后台手动触发`)
    }
  }

  /** 公开方法：从 .env 同步 Provider 到数据库 + Redis */
  async seedFromEnv(): Promise<{ created: number; skipped: number; message: string }> {
    let created = 0
    let skipped = 0

    for (const def of AiProviderSeeder.PROVIDER_DEFS) {
      try {
        const apiKey = (process.env[`${def.envPrefix}_API_KEY`] || '').trim()
        const enabled = process.env[`${def.envPrefix}_ENABLED`]?.toLowerCase() === 'true'

        // 未启用且无 Key → 跳过
        if (!enabled && !apiKey) continue

        const apiBase = process.env[`${def.envPrefix}_API_BASE`] || ''
        const modelName = process.env[`${def.envPrefix}_MODEL_NAME`] || ''

        // 配置不完整 → 跳过
        if (!apiKey || !apiBase || !modelName) {
          this.logger.debug(`[Seeder] ${def.displayName} 配置不完整(key=${!!apiKey}, base=${!!apiBase}, model=${!!modelName})，跳过`)
          continue
        }

        // 查是否已存在
        const existing = await this.configRepo.findOne({
          where: { providerKey: def.providerKey, isDeleted: 0 },
        })

        if (existing) {
          // 更新
          existing.apiKeyEncrypted = encryptApiKey(apiKey)
          existing.apiBase = apiBase
          existing.modelName = modelName
          existing.isEnabled = enabled ? 1 : 0
          await this.configRepo.save(existing)
          skipped++
          this.logger.log(`[Seeder] 已更新: ${def.displayName} enabled=${enabled} model=${modelName}`)
        } else {
          // 新建
          const weight = parseInt(process.env[`${def.envPrefix}_WEIGHT`] || '10', 10)
          const priority = parseInt(process.env[`${def.envPrefix}_PRIORITY`] || '100', 10)
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
            balanceQueryUrl: process.env[`${def.envPrefix}_BALANCE_URL`] || null,
          })
          await this.configRepo.save(cfg)
          created++
          this.logger.log(`[Seeder] 已创建: ${def.displayName} enabled=${enabled} model=${modelName}`)
        }
      } catch (e: any) {
        this.logger.error(`[Seeder] 处理 ${def.displayName} 出错: ${e?.message}`)
      }
    }

    const summary = created > 0 || skipped > 0
      ? `同步完成: 新建 ${created}，更新 ${skipped}`
      : `未发现可同步的 Provider。确保 .env 中配置了 XXX_ENABLED=true 且 XXX_API_KEY=真实key`

    this.logger.log(`[Seeder] ${summary}`)

    if (created > 0 || skipped > 0) {
      await this.configService.syncToRedis().catch(e =>
        this.logger.error(`[Seeder] Redis 同步失败: ${e?.message}`),
      )
    }

    return { created, skipped, message: summary }
  }
}
