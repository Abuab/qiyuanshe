import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/** CRM 客户跟进记录 — 运营/红娘对客户的每次跟进留痕 */
@Entity('crm_follow_records')
export class CrmFollowRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 客户（用户）ID，关联 users.id */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 跟进人（后台账号）ID，关联 admin_users.id */
  @Index()
  @Column({ type: 'int' })
  adminUserId: number

  /** 跟进内容 */
  @Column({ type: 'text' })
  content: string

  /** 下次跟进时间（可空，用于待办提醒） */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  nextFollowAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
