import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  subtitle: string

  @Column({ type: 'varchar', length: 500, name: 'coverImage' })
  coverImage: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'varchar', length: 20, default: 'latest', name: 'activityType' })
  activityType: string

  @Column({ type: 'datetime', nullable: true, name: 'signUpEndTime' })
  signUpEndTime: Date

  @Column({ type: 'datetime', name: 'startTime' })
  startTime: Date

  @Column({ type: 'datetime', name: 'endTime' })
  endTime: Date

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string

  @Column({ type: 'int', default: 0, name: 'maxParticipants' })
  maxParticipants: number

  @Column({ type: 'int', default: 0, name: 'currentParticipants' })
  currentParticipants: number

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @Column({ type: 'tinyint', default: 1, name: 'isActive' })
  isActive: number

  @Column({ type: 'int', default: 0, name: 'sortOrder' })
  sortOrder: number

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date
}
