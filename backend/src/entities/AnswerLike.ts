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
import { QuestionAnswer } from './QuestionAnswer'

@Entity('answer_likes')
export class AnswerLike {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  answerId: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @ManyToOne(() => QuestionAnswer)
  @JoinColumn({ name: 'answerId' })
  answer: QuestionAnswer
}
