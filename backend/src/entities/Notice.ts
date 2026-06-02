import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum NoticeType {
  POPUP = 'popup',
  LIST = 'list',
}

@Entity('notices')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'enum', enum: NoticeType, default: NoticeType.LIST })
  type: NoticeType

  @Column({ type: 'tinyint', default: 1 })
  status: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
