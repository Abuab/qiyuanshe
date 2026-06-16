import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('notify_logs')
export class NotifyLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 通知类型: photo | user | report */
  @Index()
  @Column({ type: 'varchar', length: 30 })
  notifyType: string

  /** 通知通道: wecom | feishu | dingtalk */
  @Column({ type: 'varchar', length: 30 })
  channel: string

  /** 是否成功 */
  @Column({ type: 'tinyint', default: 1 })
  success: number

  /** 失败原因 */
  @Column({ type: 'text', nullable: true })
  errorMessage: string

  /** 用户ID */
  @Index()
  @Column({ type: 'int', nullable: true })
  userId: number

  /** 用户昵称 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  userNickname: string

  /** 触发来源: photo_upload | photo_audit | profile_edit | post_publish */
  @Column({ type: 'varchar', length: 50 })
  source: string

  /** 消息内容摘要 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  content: string

  @CreateDateColumn()
  createdAt: Date
}
