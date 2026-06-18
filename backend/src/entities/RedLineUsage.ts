import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/**
 * 红线索使用记录
 * 每次使用红线索解锁他人联系方式时记录
 */
@Entity('red_line_usages')
@Index(['userId', 'targetUserId'])
export class RedLineUsage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 谁使用了红线索 */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 解锁了谁的联系方式 */
  @Column({ type: 'bigint' })
  targetUserId: number

  /** 解锁后展示的联系方式（微信/手机号） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unlockedContact: string

  /** 关联的额度记录 ID */
  @Column({ type: 'bigint', nullable: true })
  quotaId: number | null

  @CreateDateColumn()
  createdAt: Date
}
