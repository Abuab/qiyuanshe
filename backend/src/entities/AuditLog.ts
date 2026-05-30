import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'varchar', length: 50 })
  targetType: string

  @Index()
  @Column()
  targetId: number

  @Column({ type: 'varchar', length: 50 })
  action: string

  @Column({ type: 'text', nullable: true })
  reason: string

  @Column({ type: 'int', nullable: true })
  adminId: number

  @Column({ type: 'text', nullable: true })
  adminNote: string

  @CreateDateColumn()
  createdAt: Date
}
