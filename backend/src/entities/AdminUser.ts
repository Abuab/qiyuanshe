import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MATCHMAKER = 'matchmaker',
  OPERATOR = 'operator',
  READONLY = 'readonly',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string

  @Column({ type: 'varchar', length: 128 })
  password: string

  @Column({ type: 'varchar', length: 50, default: '' })
  nickname: string

  @Index()
  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.READONLY })
  role: AdminRole

  @Index()
  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'varchar', length: 64, nullable: true })
  mfaSecret: string

  @Column({ type: 'boolean', default: false })
  isMfaEnabled: boolean

  @Column({ type: 'varchar', length: 500, default: '' })
  avatar: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
