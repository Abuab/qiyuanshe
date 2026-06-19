import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * AI 缘分匹配分析报告
 * 缓存同一对用户的分析结果，7天内重复点击返回缓存；
 * 任何一方资料变更时由外部逻辑清除缓存
 */
@Entity('ai_match_reports')
@Index(['userId', 'targetUserId'], { unique: true })
@Index(['userId'])
@Index(['targetUserId'])
export class AiMatchReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 发起分析的用户 ID */
  @Column({ type: 'bigint' })
  userId: number

  /** 被分析的目标用户 ID */
  @Column({ type: 'bigint' })
  targetUserId: number

  // ===== 综合匹配度 =====

  /** 综合匹配度 0-100 */
  @Column({ type: 'tinyint' })
  overallScore: number

  // ===== 三维度得分 =====

  /** 三观契合度 0-100 */
  @Column({ type: 'tinyint' })
  valuesScore: number

  /** 生活方式契合度 0-100 */
  @Column({ type: 'tinyint' })
  lifestyleScore: number

  /** 未来规划契合度 0-100 */
  @Column({ type: 'tinyint' })
  futurePlanScore: number

  // ===== AI 生成内容 =====

  /** 自然语言分析（80-120字） */
  @Column({ type: 'varchar', length: 500 })
  analysisText: string

  /** 相处建议（JSON数组，3条） */
  @Column({ type: 'text' })
  adviceList: string

  // ===== 分析依据 =====

  /** 使用的用户标签数量 */
  @Column({ type: 'int', default: 0 })
  userTagCount: number

  /** 使用的目标标签数量 */
  @Column({ type: 'int', default: 0 })
  targetTagCount: number

  /** 重叠标签数量 */
  @Column({ type: 'int', default: 0 })
  overlapTagCount: number

  /** 使用的用户问答数量 */
  @Column({ type: 'int', default: 0 })
  userAnswerCount: number

  /** 使用的目标问答数量 */
  @Column({ type: 'int', default: 0 })
  targetAnswerCount: number

  // ===== 元数据 =====

  /** AI 生成耗时（毫秒） */
  @Column({ type: 'int', default: 0 })
  generationMs: number

  /** 关联的 AI 调用日志 ID */
  @Column({ type: 'bigint', nullable: true })
  aiCallLogId: number | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
