import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('circle_members')
@Index(['circleId', 'userId'], { unique: true })
export class CircleMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ type: 'bigint', comment: '圈子ID' })
  circleId: number

  @Column({ type: 'bigint', comment: '用户ID' })
  userId: number

  @Column({ type: 'int', default: 0, comment: '排序权重，越小越靠前' })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date
}
