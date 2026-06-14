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

@Entity('dynamics')
export class Dynamic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint' })
  userId: number

  /** 动态类型：'photo' 更新相册 | 'answer' 回答问题 | 'text' 纯文字(仅后台) */
  @Column({ type: 'varchar', length: 20, default: 'text' })
  type: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'json', nullable: true })
  images: string[]

  /** 关联的业务 ID（如 answerId、questionId 等） */
  @Column({ type: 'bigint', nullable: true })
  referenceId: number

  /** 关联的问题 ID（answer 类型时使用） */
  @Column({ type: 'bigint', nullable: true })
  questionId: number

  /** 关联的问题标题（answer 类型时展示） */
  @Column({ type: 'varchar', length: 300, nullable: true })
  questionTitle: string

  @Column({ type: 'int', default: 0 })
  totalImages: number

  @Column({ type: 'int', default: 0 })
  likeCount: number

  @Column({ type: 'int', default: 0 })
  commentCount: number

  /** 0=待审核, 1=已通过（自动生成直接为1）, 2=已拒绝 */
  @Column({ type: 'tinyint', default: 1 })
  status: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User
}
