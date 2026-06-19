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

/**
 * AI 功能开关操作日志
 * 记录每次开关变更，保留90天
 */
@Entity('ai_feature_switch_logs')
@Index(['featureKey', 'createdAt'])
@Index(['operatorId', 'createdAt'])
export class AiFeatureSwitchLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 变更的开关 key，如 ai.feature.match.enabled */
  @Column({ type: 'varchar', length: 100 })
  featureKey: string

  /** 变更前值: '0' | '1' */
  @Column({ type: 'varchar', length: 5 })
  oldValue: string

  /** 变更后值: '0' | '1' */
  @Column({ type: 'varchar', length: 5 })
  newValue: string

  /** 操作人 */
  @Index()
  @Column({ type: 'int', nullable: true })
  operatorId: number | null

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: AdminUser | null

  /** 操作IP */
  @Column({ type: 'varchar', length: 45, default: '' })
  ipAddress: string

  @CreateDateColumn()
  createdAt: Date
}
