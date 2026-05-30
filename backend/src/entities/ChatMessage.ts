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

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  fromUserId: number

  @Index()
  @Column({ type: 'bigint' })
  toUserId: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'varchar', length: 20, default: 'text' })
  type: string

  @Column({ type: 'tinyint', default: 0 })
  isRead: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, (user) => user.sentMessages)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User

  @ManyToOne(() => User, (user) => user.receivedMessages)
  @JoinColumn({ name: 'toUserId' })
  toUser: User
}
