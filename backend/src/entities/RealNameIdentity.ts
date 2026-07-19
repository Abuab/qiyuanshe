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

/**
 * 实名认证身份信息表
 * 独立存储姓名和身份证号，与 user_auths（认证流程记录）解耦
 * 
 * 安全设计：
 * - 管理后台不可见此数据（无 admin 接口读取本表，仅本人 /auth/profile 可查姓名，不返回身份证号）
 * - 身份证号不返回给前端，仅后端验证时使用
 * - 建议生产环境对 realName / idCard 列做应用层加密（使用 AES-256-GCM，密钥存储于环境变量）
 */
@Entity('real_name_identities')
export class RealNameIdentity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index({ unique: true })
  @Column({ type: 'bigint' })
  userId: number

  /** 真实姓名（建议生产环境加密存储） */
  @Column({ type: 'varchar', length: 50 })
  realName: string

  /** 身份证号 18 位（建议生产环境加密存储） */
  @Column({ type: 'varchar', length: 64 })
  idCard: string

  /** 身份证号哈希（SHA-256），用于去重查询，避免明文比对 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  idCardHash: string

  /** E证通流水号 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  eidBizSeqNo: string

  /** E证通认证完成时间 */
  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User
}
