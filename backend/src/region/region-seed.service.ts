import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AddressRegion } from '../entities/AddressRegion'

interface CDProvince { code: string; name: string }
interface CDCity { code: string; name: string; provinceCode: string }
interface CDArea { code: string; name: string; cityCode: string; provinceCode: string }
interface CDStreet { code: string; name: string; areaCode: string }

/**
 * 从 china-division 的扁平数据文件导入完整省/市/区/街道到数据库。
 *
 * 说明：
 * - 仅读取 provinces/cities/areas/streets 四个 JSON（约 4MB），
 *   不读取 villages.json（81MB，会导致堆内存 OOM）。
 * - 以行政区划 code 作为数字主键 id（省2位/市4位/区6位/街道9位，天然不冲突），
 *   parentId 取父级 code，从而形成 id 关联的四级树，供 RegionService 逐级查询。
 */
@Injectable()
export class RegionSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(AddressRegion)
    private readonly repo: Repository<AddressRegion>,
  ) {}

  async onModuleInit() {
    try {
      // 数据完整性检测：必须存在区县(level=3)层。
      // 旧数据缺失区县层、街道全是孤儿，需清空重新导入。
      const areaCount = await this.repo.count({ where: { level: 3 } })
      if (areaCount > 0) return

      const total = await this.repo.count()
      if (total > 0) {
        console.log('[RegionSeed] 检测到行政区划数据残缺（缺区县层），清空后重新导入...')
        await this.repo.clear()
      } else {
        console.log('[RegionSeed] 开始导入完整行政区划数据...')
      }

      await this.importFromChinaDivision()
      console.log('[RegionSeed] 行政区划数据导入完成')
    } catch (error: any) {
      console.error('[RegionSeed] 导入失败（不影响应用启动）:', error?.message || error)
    }
  }

  private async importFromChinaDivision() {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const provinces: CDProvince[] = require('china-division/dist/provinces.json')
    const cities: CDCity[] = require('china-division/dist/cities.json')
    const areas: CDArea[] = require('china-division/dist/areas.json')
    const streets: CDStreet[] = require('china-division/dist/streets.json')
    /* eslint-enable @typescript-eslint/no-var-requires */

    const rows: Partial<AddressRegion>[] = []
    const seen = new Set<number>()
    const push = (code: string, parentCode: string, name: string, level: number) => {
      const id = Number(code)
      if (!Number.isFinite(id) || seen.has(id)) return
      seen.add(id)
      rows.push({ id, parentId: parentCode ? Number(parentCode) : 0, name, level, code })
    }

    for (const p of provinces) push(p.code, '', p.name, 1)
    for (const c of cities) push(c.code, c.provinceCode, c.name, 2)
    for (const a of areas) push(a.code, a.cityCode, a.name, 3)
    for (const s of streets) push(s.code, s.areaCode, s.name, 4)

    // 分批插入，避免单条 SQL 过大
    const CHUNK = 1000
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.repo.insert(rows.slice(i, i + CHUNK))
    }
    console.log(
      `[RegionSeed] 导入 省${provinces.length} 市${cities.length} 区${areas.length} 街道${streets.length}，共 ${rows.length} 条`,
    )
  }
}
