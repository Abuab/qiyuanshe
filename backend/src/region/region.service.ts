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

  /**
   * 从数据库加载省/市/区数据到内存 Map，替代 require('china-division')。
   * china-division 包高达 182MB（含 villages.json 81MB），
   * require 整个包会导致堆内存暴涨 OOM。数据库已有 RegionSeedService 播种的相同数据。
   */
  private async loadRegions() {
    try {
      // 仅加载省/市/区（DB level 1-3），不加载街道（level 4，按需从 DB 查询）
      const regions = await this.addressRegionRepo.find({
        where: [{ level: 1 }, { level: 2 }, { level: 3 }],
        order: { id: 'ASC' },
      })

      if (regions.length === 0) {
        // 数据库尚未播种（首次启动时 RegionSeedService 可能尚未执行）
        return
      }

      const hasChildrenMap = new Map<number, boolean>()

      for (const r of regions) {
        const parentId = r.parentId || 0
        // DB level: 1=省→0, 2=市→1, 3=区→2（与旧 china-division 代码的 level 约定对齐）
        const memLevel = r.level - 1

        const list = this.regionsByParent.get(parentId) || []
        list.push({
          id: r.id,
          name: r.name,
          level: memLevel,
          code: r.code,
          hasChildren: true, // 默认 true，后续修正
        })
        this.regionsByParent.set(parentId, list)

        // 区级数据标记其父级（市）有子节点
        if (r.level === 3) {
          hasChildrenMap.set(parentId, true)
        }
      }

      // 修正：没有子区县的城市标记 hasChildren=false
      for (const [, list] of this.regionsByParent) {
        for (const item of list) {
          if (item.level === 1 && !hasChildrenMap.has(item.id)) {
            item.hasChildren = false
          }
        }
      }
    } catch (error: any) {
      console.warn(`[RegionService] 加载行政区划数据失败: ${error?.message || error}`)
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
