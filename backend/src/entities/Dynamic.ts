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

@Entity('dynamics')
export class Dynamic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'json', nullable: true })
  images: string[]

  @Column({ type: 'int', default: 0 })
  totalImages: number

  @Column({ type: 'int', default: 0 })
  likeCount: number

  @Column({ type: 'int', default: 0 })
  commentCount: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User
}
