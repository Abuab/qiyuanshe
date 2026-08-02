import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'int' })
  adminId: number

  @Column({ type: 'varchar', length: 50 })
  adminUsername: string

  @Index()
  @Column({ type: 'varchar', length: 50 })
  action: string

  @Column({ type: 'varchar', length: 100 })
  module: string

  @Index()
  @Column({ type: 'varchar', length: 10 })
  method: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  ip: string

  @Column({ type: 'text', nullable: true })
  detail: string

  @CreateDateColumn()
  createdAt: Date
}
