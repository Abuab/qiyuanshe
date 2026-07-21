import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('broadcast_notification_logs')
export class BroadcastLog {
  @PrimaryGeneratedColumn()
  id: number

  /** 发送管理员 ID */
  @Column({ type: 'int', nullable: true })
  senderId: number

  /** 消息标题 */
  @Column({ type: 'varchar', length: 200 })
  title: string

  /** 消息内容 */
  @Column({ type: 'text' })
  content: string

  /** 发送用户数 */
  @Column({ type: 'int', default: 0 })
  totalSent: number

  /** 目标用户 ID 列表（null 表示全部用户） */
  @Column({ type: 'json', nullable: true })
  targetUserIds: number[] | null

  @CreateDateColumn()
  createdAt: Date
}
