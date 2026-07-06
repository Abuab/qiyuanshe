import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 人格测试 - 维度定义表
 *
 * 固定四个维度：能量来源(energy)/信息获取(info)/决策方式(decision)/生活方式(lifestyle)。
 * 每个维度包含两个方向（A/B），例如 能量来源：外向型(E) / 内向型(I)。
 */
@Entity('personality_dimensions')
@Index(['isEnabled', 'sort'])
export class PersonalityDimension {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 维度编码（唯一）：energy/info/decision/lifestyle */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string

  /** 维度中文名称，如「能量来源」 */
  @Column({ type: 'varchar', length: 30 })
  name: string

  /** 方向A标识，如 E */
  @Column({ type: 'varchar', length: 20 })
  directionAKey: string

  /** 方向A中文标签，如「外向型」 */
  @Column({ type: 'varchar', length: 30 })
  directionALabel: string

  /** 方向B标识，如 I */
  @Column({ type: 'varchar', length: 20 })
  directionBKey: string

  /** 方向B中文标签，如「内向型」 */
  @Column({ type: 'varchar', length: 30 })
  directionBLabel: string

  /** 图标标识（图标名或 URL） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null

  /** 排序权重（越小越靠前，正整数） */
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
