import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { AiProviderConfig } from './AiProviderConfig'
import { User } from './User'

/**
 * AI Provider 调用日志
 *
 * 按 Provider 维度记录每次调用的开销和状态，用于成本统计和故障检测
 */
@Entity('ai_provider_call_logs')
@Index(['providerId', 'createdAt'])
@Index(['callType', 'createdAt'])
@Index(['userId'])
@Index(['status', 'createdAt'])
export class AiProviderCallLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联的 Provider */
  @Column({ type: 'bigint' })
  providerId: number

  @ManyToOne(() => AiProviderConfig)
  @JoinColumn({ name: 'providerId' })
  provider: AiProviderConfig

  /** 调用功能类型：match/chat_skill/matchmaker/fun_quiz/profile_gen */
  @Column({ type: 'varchar', length: 50 })
  callType: string

  /** 发起调用的用户 ID */
  @Column({ type: 'bigint', nullable: true })
  userId: number

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null

  /** 请求内容摘要（脱敏，截断 500 字符） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  requestSummary: string

  /** 响应内容摘要（截断 500 字符） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  responseSummary: string

  /** 输入 token 数 */
  @Column({ type: 'int', default: 0 })
  inputTokens: number

  /** 输出 token 数 */
  @Column({ type: 'int', default: 0 })
  outputTokens: number

  /** 调用耗时（毫秒） */
  @Column({ type: 'int', default: 0 })
  durationMs: number

  /** 调用状态：success / error / timeout */
  @Column({ type: 'varchar', length: 20, default: 'success' })
  status: string

  /** 错误信息（失败时记录） */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  errorMessage: string

  /** 请求 IP */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string

  @CreateDateColumn()
  createdAt: Date
}
