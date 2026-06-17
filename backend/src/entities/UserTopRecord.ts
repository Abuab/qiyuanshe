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
 * 用户置顶记录
 * 记录每次置顶的起止时间、来源和状态
 */
@Entity('user_top_records')
@Index(['userId', 'status'])
@Index(['source', 'createdAt'])
@Index(['topStartTime', 'topEndTime'])
export class UserTopRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联用户 */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User, (user) => user.topRecords)
  @JoinColumn({ name: 'userId' })
  user: User

  /** 置顶开始时间 */
  @Column({ type: 'datetime' })
  topStartTime: Date

  /** 置顶结束时间 */
  @Index()
  @Column({ type: 'datetime' })
  topEndTime: Date

  /**
   * 置顶来源:
   * - manual: 运营后台手动设置
   * - purchase: 会员购买/使用置顶卡
   */
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'purchase' })
  source: string

  /**
   * 置顶状态:
   * - 1 = 进行中
   * - 2 = 已结束
   * - 3 = 已取消
   */
  @Index()
  @Column({ type: 'tinyint', default: 1 })
  status: number

  /** 软删除标记 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
