import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 快捷问题分类
 */
@Entity('quick_question_categories')
@Index(['sort'])
@Index(['isEnabled'])
export class QuickQuestionCategory {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 分类名称 */
  @Column({ type: 'varchar', length: 20 })
  name: string

  /** 排序权重（越小越靠前） */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
