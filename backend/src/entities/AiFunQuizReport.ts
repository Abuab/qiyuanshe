import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * AI 趣味缘分测试报告缓存
 *
 * 同一组生日组合缓存 7 天（不限用户），任何资料变更需清除
 * 词汇合规：全程使用"缘分密码/契合度/相处指南"，不得出现算命八字等迷信词汇
 */
@Entity('ai_fun_quiz_reports')
@Index(['userBirthDay', 'taBirthDay', 'createdAt'])
export class AiFunQuizReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 发起测试的用户 ID */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 用户的出生日期（YYYY-MM-DD），如 1995-03-15 */
  @Index()
  @Column({ type: 'varchar', length: 10 })
  userBirthDay: string

  /** 对方的出生日期（YYYY-MM-DD） */
  @Index()
  @Column({ type: 'varchar', length: 10 })
  taBirthDay: string

  /** 用户出生时辰（可选：子丑寅卯辰巳午未申酉戌亥） */
  @Column({ type: 'varchar', length: 2, nullable: true })
  userBirthHour: string

  /** 对方出生时辰（可选） */
  @Column({ type: 'varchar', length: 2, nullable: true })
  taBirthHour: string

  // ===== 星座/生肖信息（预计算，前端展示用） =====

  @Column({ type: 'varchar', length: 10 })
  userZodiac: string

  @Column({ type: 'varchar', length: 10 })
  taZodiac: string

  @Column({ type: 'varchar', length: 10 })
  userConstellation: string

  @Column({ type: 'varchar', length: 10 })
  taConstellation: string

  // ===== AI 生成内容 =====

  /** 性格互补分析（100-200字） */
  @Column({ type: 'varchar', length: 800 })
  personalityAnalysis: string

  /** 相处模式建议（100-200字） */
  @Column({ type: 'varchar', length: 800 })
  relationshipAdvice: string

  /** 未来3个趣味时间节点（JSON数组，如 [{day, title, desc}]） */
  @Column({ type: 'text' })
  timeNodes: string

  /** 契合关键词（JSON数组，如 ["互补型","慢热配主动","天作之合"]） */
  @Column({ type: 'text' })
  keywords: string

  // ===== 元数据 =====

  /** AI 生成耗时（毫秒） */
  @Column({ type: 'int', default: 0 })
  generationMs: number

  /** 关联的 AI 调用日志 ID */
  @Column({ type: 'bigint', nullable: true })
  aiCallLogId: number | null

  /** 软删除：0=正常, 1=已删除（举报下架等） */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
