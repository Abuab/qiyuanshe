import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'
import { VipPackage } from './VipPackage'

/**
 * 用户会员订单
 * 记录每一次会员购买/续费的支付信息
 */
@Entity('vip_orders')
@Index(['userId', 'status'])
export class VipOrder {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联用户 */
  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User, (user) => user.vipOrders)
  @JoinColumn({ name: 'userId' })
  user: User

  /** 关联套餐 */
  @Index()
  @Column({ type: 'bigint', nullable: true })
  packageId: number | null

  @ManyToOne(() => VipPackage, (pkg) => pkg.orders)
  @JoinColumn({ name: 'packageId' })
  package: VipPackage

  /** 订单号（唯一） */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  orderNo: string

  /** 会员等级（冗余字段，便于快速查询） */
  @Column({ type: 'tinyint', default: 0 })
  vipLevel: number

  /** 支付金额（分，整数存储，避免浮点精度问题） */
  @Column({ type: 'bigint' })
  amount: number

  /** 支付方式: wechat / alipay / admin */
  @Column({ type: 'varchar', length: 20, nullable: true })
  payType: string

  /**
   * 支付状态:
   * - 0 = 待支付
   * - 1 = 已支付
   * - 2 = 已退款
   * - 3 = 已取消
   */
  @Index()
  @Column({ type: 'tinyint', default: 0 })
  status: number

  /** 支付时间 */
  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null

  /** 会员到期时间（支付后计算：paidAt + 套餐天数） */
  @Column({ type: 'datetime', nullable: true })
  expireTime: Date | null

  /** 第三方支付流水号 */
  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionId: string

  /** 退款金额（分） */
  @Column({ type: 'bigint', nullable: true })
  refundAmount: number | null

  /** 软删除标记 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
