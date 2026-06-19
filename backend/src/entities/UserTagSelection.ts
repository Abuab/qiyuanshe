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
import { UserSystemTag } from './UserSystemTag'

/**
 * 用户标签选择记录
 * 每个用户对每个系统标签只有一条记录，记录选择/取消状态
 */
@Entity('user_tag_selections')
@Index(['userId', 'tagId'], { unique: true })
@Index(['tagId', 'isDeleted'])
export class UserTagSelection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Index()
  @Column({ type: 'bigint' })
  tagId: number

  @ManyToOne(() => UserSystemTag)
  @JoinColumn({ name: 'tagId' })
  tag: UserSystemTag

  /** 该标签是否被用户选中：0=未选, 1=已选 */
  @Column({ type: 'tinyint', default: 1 })
  isSelected: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
