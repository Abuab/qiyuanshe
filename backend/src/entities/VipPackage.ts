import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm'
import { VipOrder } from './VipOrder'

/**
 * 会员套餐
 */
@Entity('vip_packages')
@Index(['status', 'sortOrder'])
export class VipPackage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 套餐名称 */
  @Column({ type: 'varchar', length: 100 })
  name: string

  /** 套餐价格（元） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number

  /** 会员时长（天） */
  @Column({ type: 'int', default: 30 })
  durationDays: number

  /** 每日发放置顶卡数量 */
  @Column({ type: 'int', default: 0 })
  dailyTopCards: number

  /** 每张置顶卡有效期（小时），0 表示跟随会员有效期 */
  @Column({ type: 'int', default: 24 })
  topCardValidHours: number

  /** 红线索数量（套餐内赠送，用完即止，非每日重置） */
  @Column({ type: 'int', default: 0 })
  redLineCount: number

  /** 套餐文案描述（支持多行文本） */
  @Column({ type: 'text', nullable: true })
  description: string

  /** 套餐特性标签，JSON 字符串数组，如 ["每日3次置顶","专属标识","不限次匹配"] */
  @Column({ type: 'simple-json', nullable: true })
  features: string[]

  /** 状态: 1=上架 / 0=下架 */
  @Index()
  @Column({ type: 'tinyint', default: 1 })
  status: number

  /** 排序权重（越大越靠前） */
  @Column({ type: 'int', default: 0 })
  sortOrder: number

  /** 软删除标记 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => VipOrder, (order) => order.package)
  orders: VipOrder[]
}
