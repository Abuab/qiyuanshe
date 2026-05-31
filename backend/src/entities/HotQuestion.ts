import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { QuestionAnswer } from './QuestionAnswer'

@Entity('hot_questions')
export class HotQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: number

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @Column({ type: 'int', default: 0 })
  answerCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => QuestionAnswer, (answer) => answer.question)
  answers: QuestionAnswer[]
}
