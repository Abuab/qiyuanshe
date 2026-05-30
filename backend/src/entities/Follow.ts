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

@Entity('follows')
@Index(['userId', 'targetUserId'], { unique: true })
export class Follow {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id' })
  userId: number

  @Column({ name: 'target_user_id' })
  targetUserId: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User
}
