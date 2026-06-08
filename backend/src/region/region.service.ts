import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AddressRegion } from '../entities/AddressRegion'

export interface RegionItem {
  id: number
  name: string
  level: number
  code: string | null
  hasChildren: boolean
}

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(AddressRegion)
    private readonly regionRepository: Repository<AddressRegion>,
  ) {}

  async getChildren(parentId: number): Promise<RegionItem[]> {
    const list = await this.regionRepository.find({
      where: { parentId },
      order: { id: 'ASC' },
    })

    // 批量 check 是否有子级
    const ids = list.map((r) => r.id)
    if (ids.length === 0) return []

    const childrenCountMap = new Map<number, number>()
    if (ids.length <= 100) {
      // 小批量可以逐个查
      for (const id of ids) {
        const count = await this.regionRepository.count({ where: { parentId: id } })
        childrenCountMap.set(id, count)
      }
    } else {
      // 大批量一次性查
      const rows = await this.regionRepository
        .createQueryBuilder('r')
        .select('r.parentId', 'parentId')
        .addSelect('COUNT(*)', 'cnt')
        .where('r.parentId IN (:...ids)', { ids })
        .groupBy('r.parentId')
        .getRawMany()
      for (const row of rows) {
        childrenCountMap.set(Number(row.parentId), Number(row.cnt))
      }
    }

    return list.map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      code: r.code,
      hasChildren: (childrenCountMap.get(r.id) || 0) > 0,
    }))
  }

  async getPathById(regionId: number): Promise<AddressRegion[]> {
    const path: AddressRegion[] = []
    let current = await this.regionRepository.findOne({ where: { id: regionId } })
    while (current) {
      path.unshift(current)
      if (current.parentId === 0) break
      current = await this.regionRepository.findOne({ where: { id: current.parentId } })
    }
    return path
  }
}
