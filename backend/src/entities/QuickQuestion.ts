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
import { QuickQuestionCategory } from './QuickQuestionCategory'

/**
 * 快捷问题
 */
@Entity('quick_questions')
@Index(['isEnabled', 'sort'])
@Index(['categoryId', 'isEnabled'])
@Index(['sort'])
export class QuickQuestion {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 问题内容（最多20字） */
  @Column({ type: 'varchar', length: 60 })
  content: string

  /** 所属分类ID */
  @Index()
  @Column({ type: 'int', nullable: true })
  categoryId: number | null

  @ManyToOne(() => QuickQuestionCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: QuickQuestionCategory | null

  /** 排序权重（越小越靠前） */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 点击次数（用户点击快捷问题累计） */
  @Column({ type: 'int', default: 0 })
  clickCount: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
