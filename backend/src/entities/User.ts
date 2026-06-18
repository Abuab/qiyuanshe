import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm'
import { UserPhoto } from './UserPhoto'
import { UserAuth } from './UserAuth'
import { QuestionAnswer } from './QuestionAnswer'
import { VipOrder } from './VipOrder'
import { ChatMessage } from './ChatMessage'
import { UserTopRecord } from './UserTopRecord'
import { UserTopCardQuota } from './UserTopCardQuota'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  unionId: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  openid: string

  @Column({ type: 'varchar', length: 50, default: '' })
  nickname: string

  @Column({ type: 'varchar', length: 500, default: '' })
  avatar: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string

  /** 微信号（用户自行填写，红线索解锁后展示） */
  @Column({ type: 'varchar', length: 50, nullable: true })
  wechat: string

  @Column({ type: 'tinyint', default: 0 })
  gender: number

  @Column({ type: 'int', nullable: true })
  birthYear: number

  get age(): number {
    if (!this.birthYear) return 0
    return new Date().getFullYear() - this.birthYear
  }

  @Column({ type: 'int', nullable: true })
  height: number

  @Column({ type: 'int', nullable: true })
  weight: number

  @Column({ type: 'varchar', length: 20, nullable: true })
  education: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  occupation: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  incomeRange: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  housingStatus: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  carStatus: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  maritalStatus: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  onlyChild: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  whenMarry: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  zodiac: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  constellation: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  hometown: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  residence: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  partnerAgeRange: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerHeightMin: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerEducation: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerIncome: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  housingRequirement: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerMaritalStatus: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  acceptChildren: string

  @Column({ type: 'text', nullable: true })
  mateRequirement: string

  @Column({ type: 'tinyint', default: 0 })
  isRealName: number

  @Column({ type: 'tinyint', default: 0 })
  isVip: number

  @Column({ type: 'tinyint', default: 0 })
  vipLevel: number

  @Column({ type: 'datetime', nullable: true })
  vipExpireTime: Date

  @Column({ type: 'tinyint', default: 2 })
  status: number

  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @Column({ type: 'text', nullable: true })
  adminRemark: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  deleteReason: string

  @Column({ type: 'simple-json', nullable: true })
  tags: string[]

  @Column({ type: 'simple-json', nullable: true })
  personalityTags: string[]

  @Column({ type: 'simple-json', nullable: true })
  hopeTaTags: string[]

  @Column({ type: 'varchar', length: 128, nullable: true })
  password: string

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date

  @Column({ type: 'varchar', length: 64, nullable: true })
  mfaSecret: string

  @Column({ type: 'boolean', default: false })
  isMfaEnabled: boolean

  @Column({ type: 'varchar', length: 10, default: 'none' })
  mfaType: string

  // ===== 运营/推荐系统字段 =====

  /** 手动加权分（仅后台可见，不对外暴露） */
  @Column({ type: 'int', default: 0 })
  manualBoostScore: number

  /** 运营置顶到期时间 */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  pinnedExpireAt: Date | null

  /** 曝光池级别: city=同城 / province=同省 / national=全国 */
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'city' })
  exposurePool: string

  /** 最后活跃时间（浏览/发消息/更新资料等） */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  lastActiveAt: Date | null

  /** 资料完整度分数 (0~100) */
  @Column({ type: 'tinyint', default: 0 })
  profileScore: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => UserPhoto, (photo) => photo.user)
  photos: UserPhoto[]

  @OneToMany(() => UserAuth, (auth) => auth.user)
  auths: UserAuth[]

  @OneToMany(() => QuestionAnswer, (answer) => answer.user)
  answers: QuestionAnswer[]

  @OneToMany(() => VipOrder, (order) => order.user)
  vipOrders: VipOrder[]

  @OneToMany(() => ChatMessage, (message) => message.fromUser)
  sentMessages: ChatMessage[]

  @OneToMany(() => ChatMessage, (message) => message.toUser)
  receivedMessages: ChatMessage[]

  @OneToMany(() => UserTopRecord, (record) => record.user)
  topRecords: UserTopRecord[]

  @OneToMany(() => UserTopCardQuota, (quota) => quota.user)
  topCardQuotas: UserTopCardQuota[]
}
