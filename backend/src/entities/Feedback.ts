import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum FeedbackStatus {
  UNPROCESSED = 0,
  PROCESSED = 1,
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'bigint' })
  userId: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'json', nullable: true })
  images: string[]

  @Column({ type: 'tinyint', default: FeedbackStatus.UNPROCESSED })
  status: FeedbackStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
