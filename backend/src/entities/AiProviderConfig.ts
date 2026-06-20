import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/** 负载均衡策略枚举 */
export enum LoadBalanceStrategy {
  /** 按权重分配 */
  WEIGHTED = 'weighted',
  /** 主备模式：始终用主，故障切备 */
  PRIMARY_BACKUP = 'primary_backup',
  /** 轮询模式 */
  ROUND_ROBIN = 'round_robin',
}

/**
 * AI Provider 配置实体
 *
 * 每个服务商（DeepSeek/Kimi/OpenAI 等）一条记录
 * API_KEY 加密存储，返回前端时脱敏
 */
@Entity('ai_provider_configs')
@Index(['providerKey'], { unique: true })
export class AiProviderConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 服务商标识：deepseek / kimi / openai / qwen / ernie */
  @Column({ type: 'varchar', length: 50 })
  providerKey: string

  /** 管理后台展示名称：DeepSeek / Kimi(月之暗面) / OpenAI / 通义千问 */
  @Column({ type: 'varchar', length: 100 })
  displayName: string

  /** API Key（AES-256-CBC 加密存储） */
  @Column({ type: 'text' })
  apiKeyEncrypted: string

  /** API 基础地址 */
  @Column({ type: 'varchar', length: 500 })
  apiBase: string

  /** 模型名称：deepseek-chat / moonshot-v1-8k / gpt-4o-mini */
  @Column({ type: 'varchar', length: 100 })
  modelName: string

  /** 是否启用：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 是否为默认 Provider：0=否, 1=是 */
  @Column({ type: 'tinyint', default: 0 })
  isDefault: number

  /** 权重值（用于加权负载均衡），默认 10 */
  @Column({ type: 'int', default: 10 })
  weight: number

  /** 优先级（数字越小优先级越高，用于主备切换） */
  @Column({ type: 'int', default: 100 })
  priority: number

  /** 余额查询接口地址（留空表示不支持） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  balanceQueryUrl: string

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
