import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/** 运营标签库 — 后台管理员创建和维护，用于给用户打标签 */
@Entity('operation_tags')
export class OperationTag {
  @PrimaryGeneratedColumn()
  id: number

  /** 标签名称 */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 标签颜色（HEX，用于前端展示） */
  @Column({ type: 'varchar', length: 10, default: '#409EFF' })
  color: string

  /** 启用状态：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 排序 */
  @Column({ type: 'int', default: 0 })
  sortOrder: number

  /** 软删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
