import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 系统授权记录（单例）：存储经 RSA 公钥验签通过的 License Key。
 * 由管理后台「系统授权」页面激活/更新；心跳服务会更新 remoteStatus。
 */
@Entity('system_licenses')
export class SystemLicense {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: false })
  isActivated: boolean

  @Column({ type: 'text' })
  licenseKey: string

  @Column({ type: 'datetime', nullable: true })
  activatedAt: Date | null

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null

  @Column({ type: 'simple-json', nullable: true })
  features: string[] | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerId: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  machineFingerprint: string | null

  /** 远程状态：valid（默认）/ revoked（已被授权方远程吊销） */
  @Column({ type: 'varchar', length: 32, default: 'valid' })
  remoteStatus: string

  /** 远程状态更新时间（吊销宽限期从该时间起算 7 天） */
  @Column({ type: 'datetime', nullable: true })
  remoteStatusUpdatedAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
