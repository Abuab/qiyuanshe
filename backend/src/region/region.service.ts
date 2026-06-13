import { Injectable, OnModuleInit } from '@nestjs/common'

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
      // 城市暂时标记有子级（后面areas会更新）
      list.push({ id, name: c.name, level: 1, code: c.code, hasChildren: true })
      this.regionsByParent.set(parentId, list)
    }

    // 区县 (level=2)
    for (const a of data.areas) {
      const id = parseInt(a.code, 10)
      const parentId = parseInt(a.cityCode, 10)
      const list = this.regionsByParent.get(parentId) || []
      list.push({ id, name: a.name, level: 2, code: a.code, hasChildren: false })
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
    return this.regionsByParent.get(parentId) || []
  }

  async getPathById(regionId: number): Promise<{ id: number; name: string; level: number }[]> {
    // 反向查找父级链路
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
}
