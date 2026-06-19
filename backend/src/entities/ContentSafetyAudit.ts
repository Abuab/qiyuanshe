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
import { AiCallLog } from './AiCallLog'

/**
 * 审核结果枚举
 */
export enum SafetyAuditResult {
  PASS = 'pass',               // 通过
  BLOCK = 'block',             // 拦截
  MANUAL_REVIEW = 'manual_review', // 人工复核
}

/**
 * 拦截原因分类
 */
export enum BlockReasonType {
  PORNOGRAPHY = 'pornography',     // 色情低俗
  HARASSMENT = 'harassment',        // 性骚扰诱导
  FRAUD = 'fraud',                  // 诈骗诱导
  ATTACK = 'attack',                // 人身攻击
  POLITICAL = 'political',          // 政治敏感
  OTHER = 'other',                  // 其他违规
}

/**
 * 内容安全审计
 * 关联 AI 调用日志，对 AI 生成的原始内容进行安全审核
 */
@Entity('content_safety_audits')
@Index(['result', 'createdAt'])
@Index(['blockReason', 'createdAt'])
export class ContentSafetyAudit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联的 AI 调用日志 */
  @Index({ unique: true })
  @Column({ type: 'bigint' })
  aiCallLogId: number

  @ManyToOne(() => AiCallLog)
  @JoinColumn({ name: 'aiCallLogId' })
  aiCallLog: AiCallLog

  /** AI 生成的原始内容（全文，用于审计回溯） */
  @Column({ type: 'text' })
  originalContent: string

  /** 敏感词命中列表（JSON 数组，如 ["交友","投资"]） */
  @Column({ type: 'text', nullable: true })
  hitWords: string

  /** 审核结果 */
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pass' })
  result: SafetyAuditResult

  /** 拦截原因分类（仅在 result=block 时有效） */
  @Index()
  @Column({ type: 'varchar', length: 30, nullable: true })
  blockReason: BlockReasonType | null

  /** 审核详情说明（审核引擎返回的原始描述） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  detail: string

  /** 审核人（人工复核时的管理员 ID） */
  @Column({ type: 'int', nullable: true })
  reviewedBy: number | null

  /** 审核时间（人工复核时间） */
  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
