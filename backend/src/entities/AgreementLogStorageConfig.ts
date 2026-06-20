import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 协议同意记录存储配置
 * 使用 system_configs 表风格，key-value 存储
 */
@Entity('agreement_log_storage_configs')
export class AgreementLogStorageConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 配置项标识 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  configKey: string

  /** 配置值 */
  @Column({ type: 'text', nullable: true })
  configValue: string

  /** 描述 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
