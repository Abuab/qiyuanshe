import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn()
  id: number

  /** 模板名称（运营后台展示用） */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /** 默认消息标题（支持占位符：{nickname}） */
  @Column({ type: 'varchar', length: 200, default: '' })
  title: string

  /** 模板内容（支持占位符：{nickname}, {referral}等） */
  @Column({ type: 'text' })
  content: string

  /** 分类: notification=系统通知, greeting=欢迎, reminder=提醒, marketing=营销 */
  @Index()
  @Column({ type: 'varchar', length: 30, default: 'notification' })
  category: string

  /** 支持的占位符列表（JSON数组，含说明） */
  @Column({ type: 'simple-json', nullable: true })
  placeholders: { key: string; label: string; example: string }[]

  /** 使用次数（发送统计） */
  @Column({ type: 'int', default: 0 })
  useCount: number

  /** 最近一次使用时间 */
  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null

  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
