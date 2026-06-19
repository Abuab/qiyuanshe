import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

/**
 * AI 调用类型枚举
 */
export enum AiCallType {
  MATCH = 'match',             // 缘分匹配
  CHAT_SKILL = 'chat_skill',   // 聊天话术
  MATCHMAKER = 'matchmaker',   // 红娘咨询
  FUN_QUIZ = 'fun_quiz',       // 趣味测试
  PROFILE_GEN = 'profile_gen', // 画像生成
}

/**
 * AI 调用日志
 * 记录每次 AI 服务调用的请求和响应，用于频率控制、成本核算、安全审计
 */
@Entity('ai_call_logs')
@Index(['userId', 'callType'])
@Index(['callType', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['deviceFingerprint', 'createdAt'])
export class AiCallLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 调用用户 */
  @Index()
  @Column({ type: 'bigint', nullable: true })
  userId: number | null

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null

  /** 调用类型 */
  @Index()
  @Column({ type: 'varchar', length: 30 })
  callType: AiCallType

  /** 本次调用消耗次数 */
  @Column({ type: 'int', default: 1 })
  consumeCount: number

  /** 调用方 IP 地址 */
  @Column({ type: 'varchar', length: 45, default: '' })
  ipAddress: string

  /** 请求 User-Agent */
  @Column({ type: 'varchar', length: 500, default: '' })
  userAgent: string

  /** 设备指纹（前端生成，用于防刷） */
  @Column({ type: 'varchar', length: 128, default: '' })
  deviceFingerprint: string

  /** 请求摘要（已脱敏，不含个人信息，JSON 格式） */
  @Column({ type: 'text', nullable: true })
  requestSummary: string

  /** 响应状态：success / error / timeout */
  @Column({ type: 'varchar', length: 20, default: 'success' })
  responseStatus: string

  /** 响应耗时（毫秒） */
  @Column({ type: 'int', default: 0 })
  responseMs: number

  /** 内容安全标记：0=未检测, 1=安全, 2=疑似违规, 3=确认违规 */
  @Column({ type: 'tinyint', default: 0 })
  safetyFlag: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
