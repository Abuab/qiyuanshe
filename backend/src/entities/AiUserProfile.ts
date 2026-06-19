import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

/**
 * AI 用户画像
 * 由 AI 根据用户选择的系统标签 + 审核通过的问答内容自动生成
 * 用户不可直接编辑，只能触发刷新（重新生成）
 */
export enum ProfileStatus {
  NORMAL = 'normal',      // 正常展示
  REMOVED = 'removed',     // 已下架（管理员操作）
}

@Entity('ai_user_profiles')
@Index(['userId', 'status'])
export class AiUserProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联用户 */
  @Index({ unique: true })
  @Column({ type: 'bigint' })
  userId: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  /** AI 生成的画像摘要（一句话概括，用于卡片展示） */
  @Column({ type: 'varchar', length: 200, nullable: true })
  summary: string

  /** AI 生成的完整画像内容（JSON 文本，包含各维度分析） */
  @Column({ type: 'text', nullable: true })
  content: string

  /** 画像生成时使用的问答数量 */
  @Column({ type: 'int', default: 0 })
  answerCount: number

  /** 画像生成时使用的标签数量 */
  @Column({ type: 'int', default: 0 })
  tagCount: number

  /** 生成版本号（每次刷新递增） */
  @Column({ type: 'int', default: 1 })
  version: number

  /** 画像状态 */
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'normal' })
  status: ProfileStatus

  /** 下架原因（管理员填写） */
  @Column({ type: 'varchar', length: 500, nullable: true })
  removeReason: string

  /** 下架操作人（管理员 ID） */
  @Column({ type: 'bigint', nullable: true })
  removedBy: number | null

  /** 下架时间 */
  @Column({ type: 'datetime', nullable: true })
  removedAt: Date | null

  /** 上次生成耗时（毫秒） */
  @Column({ type: 'int', nullable: true })
  generationMs: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
