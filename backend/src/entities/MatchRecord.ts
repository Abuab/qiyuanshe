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
import { Matchmaker } from './Matchmaker'

@Entity('match_records')
export class MatchRecord {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'bigint' })
  matchedUserId: number

  @Column({ type: 'int', nullable: true })
  matchmakerId: number

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: 'pending/in_progress/success/failed' })
  status: string

  @Column({ type: 'text', nullable: true })
  remark: string

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'matchedUserId' })
  matchedUser: User

  @ManyToOne(() => Matchmaker)
  @JoinColumn({ name: 'matchmakerId' })
  matchmaker: Matchmaker
}
