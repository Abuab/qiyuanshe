import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('circles')
export class Circle {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '圈子顶部Banner图' })
  bannerImage: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'int', default: 0 })
  sort: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
