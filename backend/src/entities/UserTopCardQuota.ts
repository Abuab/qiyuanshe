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
 * 用户置顶卡额度
 * 按天记录用户剩余可用置顶卡次数
 * Redis 辅助方案：每日 0 点从会员套餐配额刷新当日额度
 */
@Entity('user_top_card_quotas')
@Index(['userId', 'date', 'isDeleted'])
export class UserTopCardQuota {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联用户 */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User, (user) => user.topCardQuotas)
  @JoinColumn({ name: 'userId' })
  user: User

  /**
   * 配额日期，格式 YYYY-MM-DD（UTC+8）
   * 与 userId 组合唯一，每天每用户一条记录
   */
  @Index()
  @Column({ type: 'date' })
  date: string

  /** 当日总配额（来自会员套餐 dailyTopCards） */
  @Column({ type: 'int', default: 0 })
  totalQuota: number

  /** 当日已使用次数 */
  @Column({ type: 'int', default: 0 })
  usedCount: number

  /**
   * 置顶卡来源套餐 ID
   * 会员到期后，新一天不再生成配额记录
   */
  @Column({ type: 'bigint', nullable: true })
  vipPackageId: number | null

  /** 软删除标记 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
