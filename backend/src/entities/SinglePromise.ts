import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'

@Entity('single_promises')
export class SinglePromise {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  userId: number

  @Column({ type: 'varchar', length: 50 })
  realName: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl: string

  /** 0-待审核, 1-已通过, 2-已拒绝 */
  @Column({ type: 'tinyint', default: 0 })
  status: number

  @Column({ type: 'text', nullable: true })
  rejectReason: string

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  auditedBy: number

  @Column({ type: 'datetime', nullable: true })
  auditTime: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User
}
