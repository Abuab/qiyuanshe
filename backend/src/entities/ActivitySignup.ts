import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

@Entity('activity_signups')
export class ActivitySignup {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'bigint', name: 'activityId' })
  activityId: number

  @Column({ type: 'bigint', name: 'userId' })
  userId: number

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'realName' })
  realName: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  remark: string

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date
}
