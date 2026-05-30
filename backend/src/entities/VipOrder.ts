import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './User'

@Entity('vip_orders')
export class VipOrder {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  orderNo: string

  @Column({ type: 'tinyint', default: 0 })
  vipLevel: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ type: 'varchar', length: 20, nullable: true })
  payType: string

  @Column({ type: 'tinyint', default: 0 })
  status: number

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date

  @Column({ type: 'datetime', nullable: true })
  expireTime: Date

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User, (user) => user.vipOrders)
  @JoinColumn({ name: 'userId' })
  user: User
}
