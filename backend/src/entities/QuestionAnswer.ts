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
import { HotQuestion } from './HotQuestion'

@Entity('question_answers')
export class QuestionAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  questionId: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'json', nullable: true })
  photos: string[]

  @Column({ type: 'int', default: 0 })
  likeCount: number

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => HotQuestion, (question) => question.answers)
  @JoinColumn({ name: 'questionId' })
  question: HotQuestion

  @ManyToOne(() => User, (user) => user.answers)
  @JoinColumn({ name: 'userId' })
  user: User
}
