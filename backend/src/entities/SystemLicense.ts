import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 系统授权记录（单例）：存储经 RSA 公钥验签通过的 License Key。
 * 由管理后台「系统授权」页面激活/更新；纯离线模式，无远程心跳与吊销。
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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
