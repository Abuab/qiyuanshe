import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'

@Entity('user_blocks')
export class UserBlock {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'bigint' })
  blockerId: number

  @Index()
  @Column({ type: 'bigint' })
  blockedUserId: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blockerId' })
  blocker: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blockedUserId' })
  blockedUser: User
}
