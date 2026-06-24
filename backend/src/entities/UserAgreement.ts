import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

/**
 * 用户协议同意记录
 * 每次用户同意/不同意协议时，追加一条记录（不留历史覆盖）
 */
@Entity('user_agreements')
@Index(['userId', 'agreementType'])
export class UserAgreement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 协议类型：USER_AGREEMENT / PRIVACY_POLICY */
  @Column({ type: 'varchar', length: 50 })
  agreementType: string

  /** 协议版本号，如 "1.0" */
  @Column({ type: 'varchar', length: 20 })
  version: string

  /** 动作：agree / disagree */
  @Column({ type: 'varchar', length: 20 })
  action: string

  /** 用户同意时的 IP 地址 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User
}
