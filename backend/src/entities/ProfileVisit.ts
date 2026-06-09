import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

@Entity('profile_visits')
@Index(['userId', 'visitorUserId', 'createdAt'])
export class ProfileVisit {
  @PrimaryGeneratedColumn()
  id: number

  /** 被访问的用户 ID */
  @Column({ name: 'user_id' })
  userId: number

  /** 访问者 ID */
  @Column({ name: 'visitor_user_id' })
  visitorUserId: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'visitor_user_id' })
  visitorUser: User
}
