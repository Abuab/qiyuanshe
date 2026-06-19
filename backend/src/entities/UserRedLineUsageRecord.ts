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
 * 解锁渠道枚举
 */
export enum UnlockSource {
  VIP_GIFT = 'vip_gift',         // 会员赠送
  PURCHASE = 'purchase',         // 单独购买
}

/**
 * 用户红线索使用记录
 * 每次使用红线索解锁他人联系方式时记录，与现有红线索额度体系结合
 */
@Entity('user_red_line_usage_records')
@Index(['userId', 'targetUserId'])
@Index(['userId', 'createdAt'])
@Index(['unlockSource', 'createdAt'])
export class UserRedLineUsageRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 谁使用了红线索 */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  /** 解锁了谁的联系方式 */
  @Index()
  @Column({ type: 'bigint' })
  targetUserId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User

  /** 本次消耗红线索数 */
  @Column({ type: 'int', default: 1 })
  consumedCount: number

  /** 解锁后展示的联系方式（微信/手机号） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unlockedContact: string

  /** 解锁渠道 */
  @Column({ type: 'varchar', length: 20, default: 'vip_gift' })
  unlockSource: UnlockSource

  /** 关联的额度记录 ID */
  @Column({ type: 'bigint', nullable: true })
  quotaId: number | null

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
