import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Matchmaker } from './Matchmaker'

@Entity('matchmaker_comments')
export class MatchmakerComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  matchmakerId: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'tinyint', default: 5 })
  rating: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => Matchmaker)
  @JoinColumn({ name: 'matchmakerId' })
  matchmaker: Matchmaker
}
