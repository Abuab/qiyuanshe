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
  partnerHometown: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  partnerResidence: string

  @Column({ type: 'varchar', length: 50, nullable: true })
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
}
