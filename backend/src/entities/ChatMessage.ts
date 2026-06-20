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

  /** 是否代发消息：0=否, 1=是 */
  @Column({ type: 'tinyint', default: 0 })
  isProxy: number

  /** 代发人 ID（管理员 ID） */
  @Column({ type: 'int', nullable: true })
  proxyBy: number | null

  /** 代发人名称 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  proxyName: string | null

  /** 代发时间 */
  @Column({ type: 'datetime', nullable: true })
  proxyTime: Date | null

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, (user) => user.sentMessages)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User

  @ManyToOne(() => User, (user) => user.receivedMessages)
  @JoinColumn({ name: 'toUserId' })
  toUser: User
}
