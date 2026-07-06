import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { PersonalityDimension } from './PersonalityDimension'
import { PersonalityOption } from './PersonalityOption'

/**
 * 人格测试 - 题目表
 *
 * 每道题归属唯一维度，包含两个选项（见 PersonalityOption）。
 */
@Entity('personality_questions')
@Index(['isEnabled', 'sort'])
@Index(['dimensionId', 'isEnabled'])
export class PersonalityQuestion {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 题目文本 */
  @Column({ type: 'varchar', length: 500 })
  content: string

  /** 所属维度ID */
  @Index()
  @Column({ type: 'int' })
  dimensionId: number

  /** 所属维度（懒加载，避免循环依赖） */
  @ManyToOne(() => PersonalityDimension, { lazy: true })
  @JoinColumn({ name: 'dimensionId' })
  dimension: Promise<PersonalityDimension>

  /** 显示排序权重（越小越靠前，正整数） */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  /** 选项列表（懒加载） */
  @OneToMany(() => PersonalityOption, (option) => option.question, { lazy: true })
  options: Promise<PersonalityOption[]>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
