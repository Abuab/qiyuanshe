import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

/** 协议同意记录 */
@Entity('user_agreement_logs')
@Index(['userId', 'agreementType'])
@Index(['userId', 'createdAt'])
@Index(['agreementType', 'createdAt'])
export class UserAgreementLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 用户 ID */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 协议类型：USER_AGREEMENT / PRIVACY_POLICY / VIP_AGREEMENT / SELF_DISCIPLINE_STATEMENT */
  @Column({ type: 'varchar', length: 50 })
  agreementType: string

  /** 协议版本号 */
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string

  /** 操作：agree / disagree */
  @Column({ type: 'varchar', length: 20 })
  action: string

  /** 客户端 IP */
  @Column({ type: 'varchar', length: 45, default: '' })
  ipAddress: string

  /** 客户端设备信息 */
  @Column({ type: 'varchar', length: 500, default: '' })
  userAgent: string

  /** 存储来源：local / sls */
  @Column({ type: 'varchar', length: 10, default: 'local' })
  storageSource: string

  /** SLS 日志 ID（写入 SLS 时记录，便于关联查询） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  slsLogId: string

  @CreateDateColumn()
  createdAt: Date
}
