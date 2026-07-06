import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'

/**
 * 用户文案曝光记录
 *
 * 用途：
 * 1. 曝光去重——(slotId, userKey, statDate) 唯一，同一用户同一天同一文案位只计一次；
 * 2. A/B 样本分组——记录该用户在该文案位实际命中的 itemId。
 *
 * userKey 规则：登录用户 `u:{userId}`，游客 `v:{visitorId}`。
 */
@Entity('copy_exposure_logs')
@Index('UQ_copy_exposure_slot_user_date', ['slotId', 'userKey', 'statDate'], { unique: true })
export class CopyExposureLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'int' })
  slotId: number

  @Column({ type: 'int' })
  itemId: number

  @Index()
  @Column({ type: 'varchar', length: 80 })
  userKey: string

  @Column({ type: 'date' })
  statDate: string

  @CreateDateColumn()
  createdAt: Date
}
