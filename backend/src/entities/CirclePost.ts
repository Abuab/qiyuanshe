import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Circle } from './Circle'

@Entity('circle_posts')
export class CirclePost {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  circleId: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'json', nullable: true })
  images: string[]

  @Column({ type: 'int', default: 0 })
  likes: number

  @Column({ type: 'int', default: 0 })
  comments: number

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => Circle)
  @JoinColumn({ name: 'circleId' })
  circle: Circle
}
