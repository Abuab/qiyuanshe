import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('matchmakers')
export class Matchmaker {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 50, nullable: true })
  name: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  wechat: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  qrCode: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
