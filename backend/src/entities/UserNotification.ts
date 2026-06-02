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

@Entity('user_notifications')
export class UserNotification {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'varchar', length: 50, default: 'admin' })
  senderType: string

  @Column({ type: 'int', nullable: true })
  senderId: number

  @Column({ type: 'tinyint', default: 0 })
  isRead: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User
}
