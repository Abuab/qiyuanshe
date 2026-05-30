import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  configKey: string

  @Column({ type: 'text', nullable: true })
  configValue: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
