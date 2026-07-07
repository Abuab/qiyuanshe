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
import { PersonalityType } from './PersonalityType'

/**
 * 人格测试 - 用户人格结果表
 *
 * 与用户一对一关联（userId 唯一），方便前端快速读取展示。
 * 用户重新测试时直接覆盖（更新）同一行，保证一对一关系。
 * 仅通过 userId 外键关联 users 表，不修改 users 表结构。
 */
@Entity('personality_results')
@Index(['typeCode', 'isDeleted'])
// 数据看板高频查询索引：类型下钻分页(排序)、今日新增、平均答题时长聚合
@Index(['typeCode', 'isDeleted', 'testedAt'])
@Index(['isDeleted', 'testedAt'])
@Index(['isDeleted', 'durationSeconds'])
export class PersonalityResult {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 用户ID（唯一，一对一关联 users.id，不修改 users 表） */
  @Index({ unique: true })
  @Column({ type: 'bigint' })
  userId: number

  /** 命中的人格类型ID */
  @Column({ type: 'int', nullable: true })
  typeId: number | null

  /** 命中的人格类型（懒加载） */
  @ManyToOne(() => PersonalityType, { lazy: true })
  @JoinColumn({ name: 'typeId' })
  type: Promise<PersonalityType>

  /** 冗余存储类型编码，便于前端快速读取，如 INTJ */
  @Column({ type: 'varchar', length: 10, nullable: true })
  typeCode: string | null

  /** 各维度得分快照，如 { energy: {E:3,I:2}, ... } */
  @Column({ type: 'simple-json', nullable: true })
  dimensionScores: Record<string, any> | null

  /** 答题耗时（秒），冗余为独立数值列以支持 SQL 聚合统计，避免读取整表 JSON */
  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null

  /** 完成测试的时间 */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  testedAt: Date | null

  /** AI 性格深度解读缓存（JSON 字符串）；重测后由 aiInterpretationAt 与 testedAt 比较自动失效重生成 */
  @Column({ type: 'text', nullable: true })
  aiInterpretation: string | null

  /** AI 解读生成时间 */
  @Column({ type: 'datetime', nullable: true })
  aiInterpretationAt: Date | null

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
