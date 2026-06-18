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
 * 用户红线索额度
 * 会员购买时发放红线索总次数，用完即止（非每日重置）
 */
@Entity('user_red_line_quotas')
@Index(['userId', 'isDeleted'])
export class UserRedLineQuota {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  /** 红线索总次数（累计购买获得） */
  @Column({ type: 'int', default: 0 })
  totalQuota: number

  /** 已使用次数 */
  @Column({ type: 'int', default: 0 })
  usedCount: number

  /** 来源套餐 ID */
  @Column({ type: 'bigint', nullable: true })
  vipPackageId: number | null

  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
