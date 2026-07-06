import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 文案每日统计（按 文案条目 + 自然日 聚合）
 *
 * 通过 (itemId, statDate) 唯一约束 + INSERT ... ON DUPLICATE KEY UPDATE 累加，
 * 天然支持并发安全的计数与 7 日趋势查询。
 */
@Entity('copy_stats')
@Index('UQ_copy_stats_item_date', ['itemId', 'statDate'], { unique: true })
export class CopyStat {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'int' })
  slotId: number

  @Column({ type: 'int' })
  itemId: number

  /** 统计自然日（东八区 YYYY-MM-DD） */
  @Column({ type: 'date' })
  statDate: string

  /** 曝光次数 */
  @Column({ type: 'int', default: 0 })
  impressions: number

  /** 点击次数 */
  @Column({ type: 'int', default: 0 })
  clicks: number

  /** 引导登录成功次数 */
  @Column({ type: 'int', default: 0 })
  loginConversions: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
