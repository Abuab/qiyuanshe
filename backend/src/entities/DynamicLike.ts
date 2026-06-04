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
import { Dynamic } from './Dynamic'

@Entity('dynamic_likes')
export class DynamicLike {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  dynamicId: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @ManyToOne(() => Dynamic)
  @JoinColumn({ name: 'dynamicId' })
  dynamic: Dynamic
}
