import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum AgreementType {
  USER_AGREEMENT = 'USER_AGREEMENT',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
}

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'varchar', length: 50 })
  type: AgreementType

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'tinyint', default: 1 })
  isActive: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
