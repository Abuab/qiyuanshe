import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 用户系统标签库
 * 由管理后台统一维护，用户只能从预设标签中多选，不可自定义输入
 */
export enum TagCategory {
  INTEREST = 'interest',       // 兴趣爱好
  PERSONALITY = 'personality',  // 性格特点
  LIFESTYLE = 'lifestyle',      // 生活方式
  VALUES = 'values',            // 价值观
  FUTURE_PLAN = 'future_plan',  // 未来规划
}

@Entity('user_system_tags')
@Index(['category', 'isEnabled'])
@Index(['category', 'sortOrder'])
export class UserSystemTag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 标签分类 */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  category: TagCategory

  /** 标签名称，如"旅行"、"摄影" */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 图标 URL（管理后台配置） */
  @Column({ type: 'varchar', length: 500, default: '' })
  iconUrl: string

  /** 排序权重（数值越小越靠前） */
  @Column({ type: 'int', default: 0 })
  sortOrder: number

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
