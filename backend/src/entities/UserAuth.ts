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

@Entity('user_auths')
export class UserAuth {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'varchar', length: 50 })
  authType: string

  @Column({ type: 'json', nullable: true })
  authData: Record<string, any>

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @Column({ type: 'text', nullable: true })
  rejectReason: string

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, (user) => user.auths)
  @JoinColumn({ name: 'userId' })
  user: User
}
