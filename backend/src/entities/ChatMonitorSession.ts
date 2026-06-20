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
import { AdminUser } from './AdminUser'
import { User } from './User'

/** 监控状态 */
export enum MonitorStatus {
  /** 进行中 */
  ACTIVE = 'active',
  /** 已结束 */
  ENDED = 'ended',
  /** 超时自动结束 */
  TIMEOUT = 'timeout',
}

/**
 * 聊天监控会话记录
 *
 * 记录运营人员对某个用户进行聊天监控的起止时间和状态
 */
@Entity('chat_monitor_sessions')
@Index('idx_monitor_target', ['targetUserId'])
@Index('idx_monitor_op_status', ['operatorId', 'status'])
export class ChatMonitorSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 运营人员 ID */
  @Index('idx_monitor_op')
  @Column({ type: 'bigint' })
  operatorId: number

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: AdminUser

  /** 被监控用户 ID */
  @Index('idx_monitor_target_user')
  @Column({ type: 'bigint' })
  targetUserId: number

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User

  /** 监控状态：active / ended / timeout */
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: MonitorStatus

  /** 监控开始时间 */
  @CreateDateColumn()
  createdAt: Date

  /** 最后活跃时间（用于超时判断） */
  @UpdateDateColumn()
  updatedAt: Date

  /** 监控结束时间 */
  @Column({ type: 'datetime', nullable: true })
  endedAt: Date | null
}
