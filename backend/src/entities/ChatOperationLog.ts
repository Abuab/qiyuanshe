import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { AdminUser } from './AdminUser'

/** 操作类型 */
export enum ChatOpAction {
  VIEW_CHAT = 'view_chat',
  SEND_PROXY_MSG = 'send_proxy_msg',
  START_MONITOR = 'start_monitor',
  END_MONITOR = 'end_monitor',
}

/**
 * 聊天操作日志（审计用，保留90天）
 */
@Entity('chat_operation_logs')
@Index('idx_oplog_op_time', ['operatorId', 'createdAt'])
@Index('idx_oplog_target_time', ['targetUserId', 'createdAt'])
export class ChatOperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 运营人员 ID */
  @Index('idx_oplog_op')
  @Column({ type: 'bigint' })
  operatorId: number

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: AdminUser

  /** 操作类型 */
  @Column({ type: 'varchar', length: 30 })
  action: ChatOpAction

  /** 被监控/操作的目标用户 ID */
  @Index('idx_oplog_target')
  @Column({ type: 'bigint', nullable: true })
  targetUserId: number | null

  /** 聊天对象 ID（代发消息时为 toUserId） */
  @Column({ type: 'bigint', nullable: true })
  peerUserId: number | null

  /** 操作内容摘要（脱敏） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  content: string | null

  @CreateDateColumn()
  createdAt: Date
}
