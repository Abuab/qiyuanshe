import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

export enum ReportType {
  USER = 'user',
  CONTENT = 'content',
  PHOTO = 'photo',
}

export enum ReportReason {
  HARASSMENT = 'harassment',
  FRAUD = 'fraud',
  FAKE_INFO = 'fake_info',
  ABUSE = 'abuse',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 0,
  PROCESSED = 1,
  REJECTED = 2,
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'bigint' })
  reporterId: number

  @Column({ type: 'bigint' })
  targetId: number

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidence: string

  @Index()
  @Column({ type: 'tinyint', default: 0 })
  status: ReportStatus

  @Column({ type: 'varchar', length: 20, nullable: true })
  result: string

  @Column({ type: 'text', nullable: true })
  remark: string

  @Column({ nullable: true })
  handlerId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
