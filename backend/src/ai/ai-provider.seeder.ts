import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderConfigService } from './ai-provider-config.service'
import { encryptApiKey } from './ai-crypto.util'

/**
 * 清洗从 .env 读取的值：去除前后空白、反引号、单双引号
 */
function cleanEnvValue(val: string): string {
  let v = (val || '').trim()
  // 去掉包裹的反引号
  if (v.startsWith('`') && v.endsWith('`')) v = v.slice(1, -1).trim()
  // 去掉包裹的双引号
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).trim()
  // 去掉包裹的单引号
  if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).trim()
  return v
}

/** 脱敏日志：只显示 Key 的前4位和后4位 */
function maskKey(key: string): string {
  if (!key || key.length <= 8) return '***'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

/**
 * 系统启动时，将 .env 中的 Provider 配置同步到数据库
 * - OnApplicationBootstrap: 所有模块就绪后自动执行
 * - 管理后台: POST /admin/ai/provider/seed-from-env 手动触发
 * - 自动清洗 .env 值（去除多余引号/反引号/空白）
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

  async onApplicationBootstrap() {
    this.logger.log('[Seeder] ====== 开始从 .env 同步 Provider 配置 ======')
    try {
      const result = await this.seedFromEnv()
      this.logger.log(`[Seeder] 启动同步完成 → ${result.message}`)
    } catch (e: any) {
      this.logger.error(`[Seeder] 启动同步异常: ${e?.message}`, e?.stack)
    }
  }

  /** 诊断：读取当前 .env 中所有 Provider 原始值（Key 脱敏） */
  getEnvDiagnostic(): Record<string, string> {
    const diag: Record<string, string> = {}
    for (const def of AiProviderSeeder.PROVIDER_DEFS) {
      const prefix = def.envPrefix
      const rawKey = process.env[`${prefix}_API_KEY`] || '(未设置)'
      const rawBase = process.env[`${prefix}_API_BASE`] || '(未设置)'
      const rawModel = process.env[`${prefix}_MODEL_NAME`] || '(未设置)'
      const rawEnabled = process.env[`${prefix}_ENABLED`] || '(未设置)'
      diag[`${prefix}_ENABLED`] = rawEnabled
      diag[`${prefix}_API_KEY`] = maskKey(rawKey)
      diag[`${prefix}_API_KEY_length`] = String(rawKey.length)
      diag[`${prefix}_API_BASE_raw`] = rawBase
      diag[`${prefix}_API_BASE_cleaned`] = cleanEnvValue(rawBase)
      diag[`${prefix}_MODEL_NAME`] = rawModel
    }
    diag['AI_DEFAULT_PROVIDER'] = process.env.AI_DEFAULT_PROVIDER || '(未设置)'
    diag['AI_ENCRYPT_KEY'] = process.env.AI_ENCRYPT_KEY ? '***已设置' : '(未设置)'
    return diag
  }

  /** 从 .env 同步 Provider 到 DB + Redis */
  async seedFromEnv(): Promise<{ created: number; skipped: number; message: string; detail: string[] }> {
    let created = 0
    let skipped = 0
    const detail: string[] = []

    for (const def of AiProviderSeeder.PROVIDER_DEFS) {
      try {
        const rawKey = process.env[`${def.envPrefix}_API_KEY`] || ''
        const apiKey = cleanEnvValue(rawKey)
        const enabled = process.env[`${def.envPrefix}_ENABLED`]?.toLowerCase() === 'true'
        const apiBase = cleanEnvValue(process.env[`${def.envPrefix}_API_BASE`] || '')
        const modelName = cleanEnvValue(process.env[`${def.envPrefix}_MODEL_NAME`] || '')

        this.logger.log(
          `[Seeder] ${def.displayName}: enabled=${enabled}, key=${maskKey(apiKey)}, ` +
          `base="${apiBase}", model="${modelName}"`,
        )

        if (!enabled && !apiKey) {
          const msg = `${def.displayName}: 未启用且无 Key，跳过`
          this.logger.debug(`[Seeder] ${msg}`)
          detail.push(msg)
          continue
        }

        if (!apiKey || !apiBase || !modelName) {
          const msg = `${def.displayName}: 配置不完整 (key=${!!apiKey}, base=${!!apiBase}, model=${!!modelName})，跳过`
          this.logger.warn(`[Seeder] ${msg}`)
          detail.push(msg)
          continue
        }

        const existing = await this.configRepo.findOne({
          where: { providerKey: def.providerKey, isDeleted: 0 },
        })

        if (existing) {
          existing.apiKeyEncrypted = encryptApiKey(apiKey)
          existing.apiBase = apiBase
          existing.modelName = modelName
          existing.isEnabled = enabled ? 1 : 0
          await this.configRepo.save(existing)
          skipped++
          const msg = `${def.displayName}: 已更新 (enabled=${enabled})`
          this.logger.log(`[Seeder] ${msg}`)
          detail.push(msg)
        } else {
          const weight = parseInt(process.env[`${def.envPrefix}_WEIGHT`] || '10', 10)
          const priority = parseInt(process.env[`${def.envPrefix}_PRIORITY`] || '100', 10)
          const isDefault = process.env.AI_DEFAULT_PROVIDER === def.providerKey
          const balanceUrl = cleanEnvValue(process.env[`${def.envPrefix}_BALANCE_URL`] || '')

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
            balanceQueryUrl: balanceUrl || null,
          })
          await this.configRepo.save(cfg)
          created++
          const msg = `${def.displayName}: 已创建 (model=${modelName}, enabled=${enabled})`
          this.logger.log(`[Seeder] ${msg}`)
          detail.push(msg)
        }
      } catch (e: any) {
        const msg = `${def.displayName}: 异常 - ${e?.message}`
        this.logger.error(`[Seeder] ${msg}`)
        detail.push(msg)
      }
    }

    const summary = created > 0 || skipped > 0
      ? `同步完成: 新建 ${created}，更新 ${skipped}`
      : `未发现可同步的 Provider。请检查服务器 .env 文件。`

    this.logger.log(`[Seeder] ====== ${summary} ======`)

    if (created > 0 || skipped > 0) {
      await this.configService.syncToRedis().catch(e =>
        this.logger.error(`[Seeder] Redis 同步失败: ${e?.message}`),
      )
    }

    return { created, skipped, message: summary, detail }
  }
}
