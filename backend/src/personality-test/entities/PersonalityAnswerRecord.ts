import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PersonalityQuestion } from './PersonalityQuestion'
import { PersonalityOption } from './PersonalityOption'

/**
 * 人格测试 - 用户答题记录表
 *
 * 记录每位用户每道题所选择的选项。
 * 重新测试时旧记录通过 isDeleted 软删除后写入新记录，保证历史可追溯。
 * 仅通过 userId 外键关联 users 表，不修改 users 表结构。
 */
@Entity('personality_answer_records')
@Index(['userId', 'isDeleted'])
@Index(['isDeleted', 'questionId', 'optionId'])
export class PersonalityAnswerRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 用户ID（关联 users.id，不修改 users 表） */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 题目ID */
  @Column({ type: 'int' })
  questionId: number

  /** 关联题目（懒加载） */
  @ManyToOne(() => PersonalityQuestion, { lazy: true })
  @JoinColumn({ name: 'questionId' })
  question: Promise<PersonalityQuestion>

  /** 所选选项ID */
  @Column({ type: 'int' })
  optionId: number

  /** 关联选项（懒加载） */
  @ManyToOne(() => PersonalityOption, { lazy: true })
  @JoinColumn({ name: 'optionId' })
  option: Promise<PersonalityOption>

  /** 归属的测试批次（用于区分多次测试），与人格结果表 id 对应 */
  @Index()
  @Column({ type: 'bigint', nullable: true })
  resultId: number | null

  /** 软删除：0=当前有效, 1=历史记录（重新测试后覆盖） */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date
}
