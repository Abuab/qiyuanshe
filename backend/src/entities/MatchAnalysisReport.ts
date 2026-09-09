import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 免费匹配分析报告（个人）
 * 用户完成「基本信息 + 择偶要求」后生成，前 N 名免费（名额由后台 matchReport.quotaTotal 配置）。
 * 每个用户仅一份（userId 唯一）；报告以 JSON 快照存储，生成后重复进入直接返回快照。
 */
@Entity('match_analysis_reports')
export class MatchAnalysisReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  /** 关联用户（每用户仅一份报告） */
  @Index('IDX_match_analysis_reports_userId', { unique: true })
  @Column({ type: 'bigint' })
  userId: number

  /** 免费名额序号（1 起，按生成顺序递增） */
  @Column({ type: 'int' })
  quotaNo: number

  /** 报告快照 JSON（画像标签/健康度/匹配池/TOP3/建议/雷达五维） */
  @Column({ type: 'longtext' })
  reportJson: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
