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
import { AiProviderConfig } from './AiProviderConfig'

/** 告警状态 */
export enum BalanceAlertStatus {
  /** 正常 */
  NORMAL = 'normal',
  /** 告警中（低于阈值） */
  ALERTING = 'alerting',
  /** 已通知（告警已推送） */
  NOTIFIED = 'notified',
}

/**
 * AI Provider 余额监控实体
 *
 * 每个 Provider 一条记录，定时任务更新
 */
@Entity('ai_provider_balances')
@Index(['providerId'], { unique: true })
export class AiProviderBalance {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联的 Provider */
  @Column({ type: 'bigint' })
  providerId: number

  @ManyToOne(() => AiProviderConfig)
  @JoinColumn({ name: 'providerId' })
  provider: AiProviderConfig

  /** 当前余额（或剩余额度），单位由各厂商定义 */
  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  currentBalance: number

  /** 上次查询时间 */
  @Column({ type: 'datetime', nullable: true })
  lastQueryAt: Date

  /** 告警阈值（低于此值时触发告警） */
  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  alertThreshold: number

  /** 告警状态 */
  @Column({ type: 'enum', enum: BalanceAlertStatus, default: BalanceAlertStatus.NORMAL })
  alertStatus: BalanceAlertStatus

  /** 连续告警次数（用于自动降级判定） */
  @Column({ type: 'int', default: 0 })
  alertCount: number

  /** 最近一次告警时间 */
  @Column({ type: 'datetime', nullable: true })
  lastAlertAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
