import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { PersonalityQuestion } from './PersonalityQuestion'

/**
 * 人格测试 - 选项表
 *
 * 每道题固定两个选项（A/B），每个选项指向所属维度的某一个方向并加分。
 * 例如选项A增加「外向型(E)」1分，选项B增加「内向型(I)」1分。
 */
@Entity('personality_options')
@Index(['questionId'])
export class PersonalityOption {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 所属题目ID */
  @Index()
  @Column({ type: 'int' })
  questionId: number

  /** 所属题目（懒加载，避免循环依赖） */
  @ManyToOne(() => PersonalityQuestion, (question) => question.options, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: Promise<PersonalityQuestion>

  /** 选项标签：A / B */
  @Column({ type: 'varchar', length: 10 })
  optionLabel: string

  /** 选项文本 */
  @Column({ type: 'varchar', length: 500 })
  content: string

  /** 指向的维度方向标识（对应维度的 directionAKey 或 directionBKey，如 E / I） */
  @Column({ type: 'varchar', length: 20 })
  directionKey: string

  /** 该方向加分值（默认1） */
  @Column({ type: 'int', default: 1 })
  score: number

  /** 选项排序（越小越靠前） */
  @Column({ type: 'int', default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
