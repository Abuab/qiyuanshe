import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, FindOptionsWhere } from 'typeorm'
import { SuccessCase } from '../entities/SuccessCase'
import { User } from '../entities/User'
import { SystemConfig } from '../entities/SystemConfig'

@Injectable()
export class SuccessCaseService {
  constructor(
    @InjectRepository(SuccessCase)
    private readonly caseRepo: Repository<SuccessCase>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  // ========== 小程序端 ==========

  async getList(page = 1, limit = 10) {
    const [list, total] = await this.caseRepo.findAndCount({
      where: { status: 1 },
      order: { sort: 'ASC', publishDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const result = await this.enrichWithUserInfo(list)
    return { list: result, total, page, limit }
  }

  async getDetail(id: number) {
    return this.caseRepo.findOne({ where: { id, status: 1 } })
  }

  /** 小程序端获取页面 Banner */
  async getPageBanner() {
    const banner = await this.configRepo.findOne({ where: { configKey: 'successCase.bannerImage' } })
    const pageTitle = await this.configRepo.findOne({ where: { configKey: 'successCase.pageTitle' } })
    return {
      bannerImage: banner?.configValue || '',
      pageTitle: pageTitle?.configValue || '',
    }
  }

  // ========== 管理后台 ==========

  async getListAll(
    page = 1,
    limit = 10,
    search?: { keyword?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: FindOptionsWhere<SuccessCase> = {}

    if (search?.keyword) {
      // 标题或显示昵称模糊搜索
      return this.searchList(page, limit, search)
    }
    if (search?.dateFrom || search?.dateTo) {
      const from = search.dateFrom || '2000-01-01'
      const to = search.dateTo || '2099-12-31'
      where.publishDate = Between(from, to) as any
    }

    const [list, total] = await this.caseRepo.findAndCount({
      where,
      order: { sort: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const result = await this.enrichWithUserInfo(list)
    return { list: result, total, page, limit }
  }

  private async searchList(page: number, limit: number, search: { keyword?: string; dateFrom?: string; dateTo?: string }) {
    const qb = this.caseRepo.createQueryBuilder('sc')
      .orderBy('sc.sort', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)

    if (search.keyword) {
      qb.andWhere('(sc.title LIKE :kw OR sc.displayNickname LIKE :kw)', { kw: `%${search.keyword}%` })
    }
    if (search.dateFrom || search.dateTo) {
      const from = search.dateFrom || '2000-01-01'
      const to = search.dateTo || '2099-12-31'
      qb.andWhere('sc.publishDate BETWEEN :from AND :to', { from, to })
    }

    const [list, total] = await qb.getManyAndCount()
    const result = await this.enrichWithUserInfo(list)
    return { list: result, total, page, limit }
  }

  async getById(id: number) {
    const item = await this.caseRepo.findOne({ where: { id } })
    if (!item) return null
    const enriched = await this.enrichWithUserInfo([item])
    return enriched[0]
  }

  async create(data: {
    title: string
    senderUserId?: number
    displayNickname?: string
    storyContent?: string
    photos?: string[]
    publishDate?: string
    sort?: number
    status?: number
  }) {
    const item = this.caseRepo.create({ ...data, status: data.status ?? 1 })
    return this.caseRepo.save(item)
  }

  async update(id: number, data: {
    title?: string
    senderUserId?: number
    displayNickname?: string
    storyContent?: string
    photos?: string[]
    publishDate?: string
    sort?: number
    status?: number
  }) {
    await this.caseRepo.update(id, data)
    return this.getById(id)
  }

  async remove(id: number) {
    await this.caseRepo.update(id, { status: 0 })
  }

  /** Banner 配置存取 */
  async getBannerConfig() {
    const banner = await this.configRepo.findOne({ where: { configKey: 'successCase.bannerImage' } })
    const pageTitle = await this.configRepo.findOne({ where: { configKey: 'successCase.pageTitle' } })
    return {
      bannerImage: banner?.configValue || '',
      pageTitle: pageTitle?.configValue || '',
    }
  }

  async saveBannerConfig(data: { bannerImage?: string; pageTitle?: string }) {
    if (data.bannerImage !== undefined) {
      await this.upsertConfig('successCase.bannerImage', data.bannerImage, '成功案例页顶部Banner图')
    }
    if (data.pageTitle !== undefined) {
      await this.upsertConfig('successCase.pageTitle', data.pageTitle, '成功案例页标题文案')
    }
    return this.getBannerConfig()
  }

  private async upsertConfig(key: string, value: string, description: string) {
    const existing = await this.configRepo.findOne({ where: { configKey: key } })
    if (existing) {
      await this.configRepo.update(existing.id, { configValue: value })
    } else {
      await this.configRepo.save(this.configRepo.create({ configKey: key, configValue: value, description }))
    }
  }

  // ========== 私有方法 ==========

  /** 批量填充发送者用户信息（头像 + 昵称） */
  private async enrichWithUserInfo(list: SuccessCase[]) {
    const userIds = new Set<number>()
    for (const item of list) {
      if (item.senderUserId) userIds.add(item.senderUserId)
    }
    const userMap = new Map<number, User>()
    if (userIds.size > 0) {
      const users = await this.userRepo.createQueryBuilder('user')
        .select(['user.id', 'user.nickname', 'user.avatar'])
        .where('user.id IN (:...ids)', { ids: [...userIds] })
        .getMany()
      for (const u of users) {
        userMap.set(u.id, u)
      }
    }

    return list.map(item => {
      const sender = item.senderUserId ? userMap.get(item.senderUserId) : null
      return {
        id: item.id,
        title: item.title,
        senderUserId: item.senderUserId,
        displayNickname: item.displayNickname || sender?.nickname || '',
        userAvatar: sender?.avatar || '',
        storyContent: item.storyContent,
        photos: item.photos || [],
        publishDate: item.publishDate,
        sort: item.sort,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    })
  }
}
