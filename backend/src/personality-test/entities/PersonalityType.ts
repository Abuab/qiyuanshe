import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 人格测试 - 人格类型定义表（16种 MBTI 类型）
 */
@Entity('personality_types')
@Index(['isEnabled', 'sort'])
export class PersonalityType {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  /** 类型编码（唯一），如 INTJ */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  code: string

  /** 中文名称，如「建筑师」 */
  @Column({ type: 'varchar', length: 50 })
  name: string

  /** 花名 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null

  /** 一句话描述 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  summary: string | null

  /** 详细性格解析文案 */
  @Column({ type: 'text', nullable: true })
  description: string | null

  /** 四维度雷达图基准值（0-100）：能量来源 */
  @Column({ type: 'int', default: 50 })
  radarEnergy: number

  /** 四维度雷达图基准值（0-100）：信息获取 */
  @Column({ type: 'int', default: 50 })
  radarInfo: number

  /** 四维度雷达图基准值（0-100）：决策方式 */
  @Column({ type: 'int', default: 50 })
  radarDecision: number

  /** 四维度雷达图基准值（0-100）：生活方式 */
  @Column({ type: 'int', default: 50 })
  radarLifestyle: number

  /** 适配推荐类型编码列表（哪些类型与该类型最匹配），如 ["ENFP","ENTP"] */
  @Column({ type: 'simple-json', nullable: true })
  matchTypes: string[] | null

  /** 排序权重（越小越靠前） */
  @Column({ type: 'int', default: 0 })
  sort: number

  /** 启用状态：0=禁用, 1=启用 */
  @Column({ type: 'tinyint', default: 1 })
  isEnabled: number

  /** 软删除：0=正常, 1=已删除 */
  @Column({ type: 'tinyint', default: 0 })
  isDeleted: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
