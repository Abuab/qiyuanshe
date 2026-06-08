import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm'

@Entity('address_region')
export class AddressRegion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Index()
  @Column({ type: 'bigint', default: 0 })
  parentId: number

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Index()
  @Column({ type: 'tinyint', comment: '1=省 2=市 3=区 4=街道' })
  level: number

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '行政区划代码' })
  code: string
}
