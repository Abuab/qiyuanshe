import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'

@Entity('user_photos')
export class UserPhoto {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'varchar', length: 500 })
  photoUrl: string

  @Column({ type: 'tinyint', default: 0 })
  isMain: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @Column({ type: 'tinyint', default: 0 })
  auditStatus: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, (user) => user.photos)
  @JoinColumn({ name: 'userId' })
  user: User
}
