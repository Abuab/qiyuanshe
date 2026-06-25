import { Injectable, OnModuleInit } from '@nestjs/common'
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
export class RegionService implements OnModuleInit {
  /** level → parentId → RegionItem[] */
  private regionsByParent = new Map<number, RegionItem[]>()

  constructor(
    @InjectRepository(AddressRegion)
    private readonly addressRegionRepo: Repository<AddressRegion>,
  ) {}

  async onModuleInit() {
    await this.loadRegions()
  }

  private async loadRegions() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('china-division') as {
      provinces: { code: string; name: string }[]
      cities: { code: string; name: string; provinceCode: string }[]
      areas: { code: string; name: string; cityCode: string; provinceCode: string }[]
    }

    const hasChildrenMap = new Map<number, boolean>()

    // 省份 (level=0)
    for (const p of data.provinces) {
      const id = parseInt(p.code, 10)
      const list = this.regionsByParent.get(0) || []
      list.push({ id, name: p.name, level: 0, code: p.code, hasChildren: true })
      this.regionsByParent.set(0, list)
    }

    // 城市 (level=1)
    for (const c of data.cities) {
      const id = parseInt(c.code, 10)
      const parentId = parseInt(c.provinceCode, 10)
      const list = this.regionsByParent.get(parentId) || []
      list.push({ id, name: c.name, level: 1, code: c.code, hasChildren: true })
      this.regionsByParent.set(parentId, list)
    }

    // 区县 (level=2)
    for (const a of data.areas) {
      const id = parseInt(a.code, 10)
      const parentId = parseInt(a.cityCode, 10)
      const list = this.regionsByParent.get(parentId) || []
      // 区县数据：标记为可能有子级（街道），后续由数据库查询判断
      list.push({ id, name: a.name, level: 2, code: a.code, hasChildren: true })
      this.regionsByParent.set(parentId, list)
      hasChildrenMap.set(parentId, true)
    }

    // 修正：没有 areas 的城市标记 hasChildren=false（直辖市等特殊情况）
    for (const [, list] of this.regionsByParent) {
      for (const item of list) {
        if (item.level === 1 && !hasChildrenMap.has(item.id)) {
          item.hasChildren = false
        }
      }
    }
  }

  async getChildren(parentId: number): Promise<RegionItem[]> {
    const mem = this.regionsByParent.get(parentId)
    if (mem && mem.length > 0) return mem

    // 内存未命中时查询数据库（第四级街道数据）
    try {
      const dbRegions = await this.addressRegionRepo.find({
        where: { parentId },
        order: { id: 'ASC' },
      })
      if (dbRegions.length > 0) {
        return dbRegions.map((r) => ({
          id: r.id,
          name: r.name,
          level: r.level,
          code: r.code,
          hasChildren: false,
        }))
      }
    } catch {
      // 数据库查询失败时返回空数组
    }
    return []
  }

  async getPathById(regionId: number): Promise<{ id: number; name: string; level: number }[]> {
    // 先尝试从内存查找
    const memPath = this.findPathInMemory(regionId)
    if (memPath.length > 0) return memPath

    // 内存未命中时从数据库逐级查询（街道数据仅在数据库）
    return this.findPathFromDb(regionId)
  }

  /** 在内存 regionsByParent 中按父子关系反向溯源 */
  private findPathInMemory(regionId: number): { id: number; name: string; level: number }[] {
    const path: { id: number; name: string; level: number }[] = []
    let currentId = regionId

    for (let i = 0; i < 10; i++) {
      let found: RegionItem | undefined
      for (const [, list] of this.regionsByParent) {
        found = list.find((r) => r.id === currentId)
        if (found) break
      }
      if (!found) break
      path.unshift({ id: found.id, name: found.name, level: found.level })
      // 找父级
      const parentEntry = [...this.regionsByParent.entries()].find(([, list]) =>
        list.some((r) => r.id === found!.id),
      )
      if (!parentEntry || parentEntry[0] === 0) break
      currentId = parentEntry[0]
    }

    return path
  }

  /** 从 DB address_region 表逐级查询路径 */
  private async findPathFromDb(regionId: number): Promise<{ id: number; name: string; level: number }[]> {
    const path: { id: number; name: string; level: number }[] = []
    let currentId = regionId
    const MAX_DEPTH = 10

    for (let i = 0; i < MAX_DEPTH; i++) {
      try {
        const region = await this.addressRegionRepo.findOne({ where: { id: currentId } })
        if (!region) break
        // 数据库存储：1=省，2=市，3=区，4=街道 → 统一转为内存层级：0=省，1=市，2=区，3=街道
        path.unshift({ id: region.id, name: region.name, level: region.level - 1 })
        if (region.parentId === 0) break
        currentId = region.parentId
      } catch {
        break
      }
    }

    return path
  }
}
