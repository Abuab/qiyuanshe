import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'
import { Matchmaker } from './Matchmaker'

@Entity('matchmaker_reviews')
export class MatchmakerReview {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'int' })
  userId: number

  @Index()
  @Column({ type: 'int' })
  matchmakerId: number

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '好搞定/不好搞定/一般' })
  difficulty: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @DeleteDateColumn()
  deletedAt: Date | null

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @ManyToOne(() => Matchmaker)
  @JoinColumn({ name: 'matchmakerId' })
  matchmaker: Matchmaker
}
