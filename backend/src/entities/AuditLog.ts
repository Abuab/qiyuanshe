import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

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

  @Column({ type: 'int', nullable: true })
  submitterId: number

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  aiResult: string

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  aiScore: number

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submitterId' })
  submitter: User

  @CreateDateColumn()
  createdAt: Date
}
