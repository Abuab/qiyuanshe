import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('success_cases')
export class SuccessCase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover: string

  @Column({ type: 'bigint', nullable: true })
  maleUserId: number

  @Column({ type: 'bigint', nullable: true })
  femaleUserId: number

  @Column({ type: 'text', nullable: true })
  storyContent: string

  @Column({ type: 'json', nullable: true })
  photos: string[]

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'int', default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
