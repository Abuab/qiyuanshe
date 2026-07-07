import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { DEFAULT_TEMPLATES, PROMPT_TEMPLATE_META } from './ai-personality.prompt'

/**
 * AI Prompt 模板服务
 *
 * 模板以原始字符串存于 system_configs（configKey: ai.prompt.*）。
 * 进程内 30s 短缓存，管理后台保存即清缓存 → 即时生效、无需重启。
 * 支持 {{变量}} 占位符替换。
 */
@Injectable()
export class AiPromptTemplateService {
  private cache = new Map<string, { value: string; expire: number }>()
  private readonly CACHE_TTL_MS = 30_000

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  /** 取单个模板（无配置则回退默认值） */
  async getTemplate(key: string): Promise<string> {
    const cached = this.cache.get(key)
    if (cached && cached.expire > Date.now()) return cached.value

    let value = DEFAULT_TEMPLATES[key] || ''
    try {
      const row = await this.configRepo.findOne({ where: { configKey: key } })
      if (row && typeof row.configValue === 'string' && row.configValue.trim()) {
        value = row.configValue
      }
    } catch {
      /* 读取失败回退默认值 */
    }
    this.cache.set(key, { value, expire: Date.now() + this.CACHE_TTL_MS })
    return value
  }

  /** 后台：列出所有模板（当前值 + 默认值 + 可用变量） */
  async getAll(): Promise<
    Array<{ key: string; label: string; variables: string[]; value: string; defaultValue: string }>
  > {
    const result = []
    for (const meta of PROMPT_TEMPLATE_META) {
      const value = await this.getTemplate(meta.key)
      result.push({
        key: meta.key,
        label: meta.label,
        variables: meta.variables,
        value,
        defaultValue: DEFAULT_TEMPLATES[meta.key] || '',
      })
    }
    return result
  }

  /** 后台：保存模板（仅允许已知 key，空值恢复默认） */
  async save(templates: Array<{ key: string; value: string }>): Promise<void> {
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new BadRequestException('缺少模板数据')
    }
    for (const t of templates) {
      if (!(t.key in DEFAULT_TEMPLATES)) {
        throw new BadRequestException(`非法模板 key: ${t.key}`)
      }
      const value = typeof t.value === 'string' ? t.value.trim() : ''
      let row = await this.configRepo.findOne({ where: { configKey: t.key } })
      if (row) {
        row.configValue = value
        await this.configRepo.save(row)
      } else {
        row = this.configRepo.create({
          configKey: t.key,
          configValue: value,
          description: `AI Prompt模板: ${t.key}`,
        })
        await this.configRepo.save(row)
      }
      this.cache.delete(t.key)
    }
  }

  /** 变量替换：将 {{key}} 替换为 vars[key] */
  render(template: string, vars: Record<string, string | number>): string {
    if (!template) return ''
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
      const v = vars[name]
      return v === undefined || v === null ? match : String(v)
    })
  }
}
