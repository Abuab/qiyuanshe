import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/** 文案位展示模式 */
export type CopyDisplayMode = 'carousel' | 'ab_test' | 'all'

/**
 * 文案位（引导文案的展示位置）
 *
 * 每个文案位有唯一 code（不可变），其下可挂多条文案。
 * 预置系统文案位 isSystem=1，不可删除但可修改内容。
 */
@Entity('copy_slots')
export class CopySlot {
  @PrimaryGeneratedColumn()
  id: number

  /** 文案位编码：唯一标识，创建后不可修改 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string

  /** 文案位名称 */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /** 所在页面位置（描述） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  pageLocation: string | null

  /** 备注说明 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  remark: string | null

  /** 展示模式：carousel 轮播 / ab_test A/B 测试 / all 全展示 */
  @Column({ type: 'varchar', length: 20, default: 'carousel' })
  displayMode: CopyDisplayMode

  /** 是否系统预置（预置不可删除） */
  @Column({ type: 'tinyint', default: 0 })
  isSystem: number

  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  @Column({ type: 'int', default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
