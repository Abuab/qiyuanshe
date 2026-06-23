import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { VipPackage } from '../entities/VipPackage'

@Injectable()
export class VipPackageService {
  constructor(
    @InjectRepository(VipPackage)
    private readonly repo: Repository<VipPackage>,
  ) {}

  /** 套餐列表（分页，按上架+权重排序） */
  async list(page = 1, limit = 20) {
    const [list, total] = await this.repo.findAndCount({
      where: { isDeleted: 0 },
      order: { status: 'DESC', sortOrder: 'DESC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list: this.normalizeTypes(list), total, page, limit }
  }

  /** 上架套餐列表（前端展示用，price 转换为元） */
  async listActive() {
    const packages = await this.repo.find({
      where: { status: 1, isDeleted: 0 },
      order: { sortOrder: 'DESC', id: 'ASC' },
    })
    return this.normalizeTypes(packages)
  }

  /** 创建套餐（管理员以"元"输入，存储为整数分） */
  async create(data: Partial<VipPackage>) {
    const pkg = this.repo.create({
      name: data.name || '',
      price: Math.round((data.price || 0) * 100), // 元 → 分
      durationDays: data.durationDays || 30,
      dailyTopCards: data.dailyTopCards || 0,
      topCardValidHours: data.topCardValidHours || 24,
      redLineCount: data.redLineCount ?? 0,
      description: data.description || '',
      features: data.features || [],
      status: data.status ?? 1,
      sortOrder: data.sortOrder || 0,
    })
    const saved = await this.repo.save(pkg)
    return this.normalizeTypes([saved])[0] // 分 → 元展示
  }

  /** 编辑套餐（管理员以"元"输入，存储为整数分） */
  async update(id: number, data: Partial<VipPackage>) {
    const pkg = await this.repo.findOne({ where: { id, isDeleted: 0 } })
    if (!pkg) throw new Error('套餐不存在')

    if (data.name !== undefined) pkg.name = data.name
    if (data.price !== undefined) pkg.price = Math.round(data.price * 100) // 元 → 分
    if (data.durationDays !== undefined) pkg.durationDays = data.durationDays
    if (data.dailyTopCards !== undefined) pkg.dailyTopCards = data.dailyTopCards
    if (data.topCardValidHours !== undefined) pkg.topCardValidHours = data.topCardValidHours
    if (data.redLineCount !== undefined) pkg.redLineCount = data.redLineCount
    if (data.description !== undefined) pkg.description = data.description
    if (data.features !== undefined) pkg.features = data.features
    if (data.status !== undefined) pkg.status = data.status
    if (data.sortOrder !== undefined) pkg.sortOrder = data.sortOrder

    const saved = await this.repo.save(pkg)
    return this.normalizeTypes([saved])[0] // 分 → 元展示
  }

  /** 切换上/下架 */
  async toggleStatus(id: number) {
    const pkg = await this.repo.findOne({ where: { id, isDeleted: 0 } })
    if (!pkg) throw new Error('套餐不存在')
    pkg.status = pkg.status === 1 ? 0 : 1
    return this.repo.save(pkg)
  }

  /** 软删除 */
  async remove(id: number) {
    const pkg = await this.repo.findOne({ where: { id } })
    if (!pkg) throw new Error('套餐不存在')
    pkg.isDeleted = 1
    return this.repo.save(pkg)
  }

  /** 批量更新排序权重 */
  async updateSort(items: { id: number; sortOrder: number }[]) {
    const ids = items.map(i => i.id)
    const packages = await this.repo.find({ where: { id: In(ids) } })
    for (const pkg of packages) {
      const item = items.find(i => i.id === pkg.id)
      if (item) pkg.sortOrder = item.sortOrder
    }
    return this.repo.save(packages).then(pkgs => this.normalizeTypes(pkgs as VipPackage[]))
  }

  /** TypeORM 可能将 BIGINT/DECIMAL 序列化为字符串，统一转为数字；
   *  price 字段在数据库中以"分"存储，此处转换为"元"用于前端展示 */
  private normalizeTypes(packages: VipPackage[]): VipPackage[] {
    return packages.map(pkg => ({
      ...pkg,
      id: Number(pkg.id),
      price: Number(pkg.price) / 100, // 分 → 元展示
    }))
  }
}
