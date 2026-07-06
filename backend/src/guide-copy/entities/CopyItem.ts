import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 文案条目（挂在某个文案位下）
 *
 * 支持主/副两行文案、权重（1-100）、启用状态，以及可选的定向条件：
 * - targetLoginState: 'guest' 仅未登录 / 'logged' 仅已登录 / null 不限
 * - targetGender: 1 男 / 2 女 / null 不限
 * - targetTested: 1 已测试 / 0 未测试 / null 不限
 * 未设置的定向维度即对所有用户生效；多个维度之间为「与」关系。
 */
@Entity('copy_items')
export class CopyItem {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'int' })
  slotId: number

  /** 主文案（第一行） */
  @Column({ type: 'varchar', length: 255 })
  mainText: string

  /** 副文案（第二行，可空） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subText: string | null

  /** 优先级权重 1-100（轮播模式按权重概率展示） */
  @Column({ type: 'int', default: 50 })
  weight: number

  /** 定向：登录状态 guest/logged/null */
  @Column({ type: 'varchar', length: 10, nullable: true })
  targetLoginState: string | null

  /** 定向：性别 1男/2女/null */
  @Column({ type: 'tinyint', nullable: true })
  targetGender: number | null

  /** 定向：是否已测试 1是/0否/null */
  @Column({ type: 'tinyint', nullable: true })
  targetTested: number | null

  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  @Column({ type: 'int', default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
