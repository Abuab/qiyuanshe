import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { User, UserPhoto, Follow } from '../entities'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { RedisService } from '../common/redis.service'

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RecommendListItem {
  id: number
  nickname: string
  avatar: string
  age: number
  height: number
  education: string
  occupation: string
  incomeRange: string
  housingStatus: string
  isRealName: number
  isVip: number
  lastLoginAt: Date | null
  photos: string[]
  isFollowed: boolean
  matchmakerComment?: string
  // 前端无感知字段（仅后端排序用，不返回）
}

export interface RecommendFilters {
  tab?: string
  ageMin?: number
  ageMax?: number
  heightMin?: number
  heightMax?: number
  education?: string
  incomeRange?: string
  maritalStatus?: string
  isRealName?: number
  residence?: string
  hometown?: string
  keyword?: string
}

// ===== 推荐分各维度权重 =====
const WEIGHTS = {
  activity: 0.25,     // 活跃度权重
  profile: 0.25,       // 资料完整度权重
  manualBoost: 0.20,   // 运营手动加权权重
  vip: 0.15,           // 会员权重
  newUser: 0.15,       // 新用户保护权重
}

// 置顶配置
const PIN_CONFIG = {
  maxPinnedSlots: 3,   // 最多N个置顶坑位
}

// 缓存 TTL（秒）
const CACHE_TTL = {
  userScore: 600,              // 单个用户推荐分缓存 10 分钟
  recommendList: 120,          // 推荐列表分页缓存 2 分钟
}

// 缓存版本号：修改推荐逻辑后递增以强制刷新所有旧缓存
const CACHE_VERSION = 2

@Injectable()
export class RecommendService {
  // 需要关联查询的字段子集（UserListItem 所需）
  private static readonly userSelect = [
    'id', 'nickname', 'avatar', 'gender', 'birthYear',
    'height', 'education', 'occupation', 'incomeRange', 'housingStatus',
    'isRealName', 'isVip', 'vipLevel', 'lastLoginAt', 'lastActiveAt',
    'profileScore', 'manualBoostScore', 'pinnedExpireAt',
    'exposurePool', 'residence', 'createdAt', 'status', 'isDeleted',
  ] as const

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
    private readonly redis: RedisService,
  ) {}

  // ========================================================================
  //  公开 API
  // ========================================================================

  /**
   * 推荐列表查询（核心入口）
   * @param city 当前用户所在城市，如"杭州"
   * @param page 页码
   * @param limit 每页条数
   * @param targetGender 目标性别（1=男 2=女）
   * @param currentUserId 当前用户ID
   * @param filters 筛选条件
   */
  async getRecommendList(
    city: string,
    page: number,
    limit: number,
    targetGender: number,
    currentUserId?: number,
    filters?: RecommendFilters,
  ): Promise<PaginatedResult<RecommendListItem>> {
    const pageNum = Math.max(1, Number(page) || 1)
    const pageSize = Math.max(1, Math.min(100, Number(limit) || 10))

    // 1. 尝试从 Redis 读取分页缓存
    const cacheKey = this.buildListCacheKey(city, pageNum, pageSize, targetGender, currentUserId, filters)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // 2. 构建基础查询（曝光池 + 城市 + 性别 + 筛选）
    // tab=verified → 强制实名筛选（isRealName 可能为 null/undefined/falsy）
    const effectiveFilters = { ...filters }
    const isRealNameMissing = filters.isRealName === undefined || filters.isRealName === null
    if (filters?.tab === 'verified' && isRealNameMissing) {
      effectiveFilters.isRealName = 1
    }
    const baseQb = this.buildBaseQuery(city, targetGender, currentUserId, effectiveFilters)

    // 3. 取置顶用户（自然混排在前，前端无感知）
    const pinnedUsers = await this.getPinnedUsers(city, targetGender, currentUserId, effectiveFilters)

    // 4. 非置顶用户排序
    // tab=newest → 按注册时间降序；否则按推荐分
    const isNewest = filters?.tab === 'newest'
    const orderBy = isNewest
      ? 'user.createdAt'
      : this.buildScoreExpression()
    const orderDir: 'DESC' = 'DESC'

    const pinnedUserIds = pinnedUsers.map(u => u.id)
    if (pinnedUserIds.length > 0) {
      baseQb.andWhere('user.id NOT IN (:...pinnedIds)', { pinnedIds: pinnedUserIds })
    }

    // 5. 先查总数（非置顶部分）
    const nonPinnedTotal = await baseQb.getCount()
    const total = pinnedUsers.length + nonPinnedTotal
    const totalPages = Math.ceil(total / pageSize)

    // 6. 分页：计算置顶和非置顶各自的偏移和数量
    let resultList: User[]
    const offset = (pageNum - 1) * pageSize

    if (pageNum === 1) {
      // 第一页：前N个是置顶用户，后面补非置顶
      const needMore = Math.max(0, pageSize - pinnedUsers.length)
      const qb = baseQb
        .orderBy(orderBy, orderDir)
        .addOrderBy(isNewest ? 'user.id' : 'user.lastActiveAt', 'DESC')
        .skip(0)
        .take(needMore)
      const nonPinnedPage = await qb.getMany()
      resultList = [...pinnedUsers, ...nonPinnedPage]
    } else {
      // 第二页起：置顶已走完，全是普通排序
      const skip = offset - pinnedUsers.length
      const take = pageSize
      if (skip < 0) {
        // 理论上不会走到这里（置顶在第一页就耗尽了）
        const fromPinned = pinnedUsers.slice(offset, offset + pageSize)
        const remain = pageSize - fromPinned.length
        const qb = baseQb
          .orderBy(orderBy, orderDir)
          .addOrderBy(isNewest ? 'user.id' : 'user.lastActiveAt', 'DESC')
          .skip(0)
          .take(remain)
        const nonPinnedPage = await qb.getMany()
        resultList = [...fromPinned, ...nonPinnedPage]
      } else {
        resultList = await baseQb
          .orderBy(orderBy, orderDir)
          .addOrderBy(isNewest ? 'user.id' : 'user.lastActiveAt', 'DESC')
          .skip(Math.max(0, skip))
          .take(take)
          .getMany()
      }
    }

    // 7. 丰富列表信息（照片、是否已关注、红娘评语）
    const userIds = resultList.map(u => u.id)
    const [photosMap, commentsMap, followedIds] = await Promise.all([
      this.getPhotosMap(userIds),
      this.getCommentsMap(userIds),
      currentUserId
        ? this.followRepository
            .find({ where: { userId: currentUserId }, select: ['targetUserId'] })
            .then(list => list.map(f => f.targetUserId))
        : Promise.resolve<number[]>([]),
    ])

    const list: RecommendListItem[] = resultList.map(user => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar || '',
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : 0,
      height: user.height || 0,
      education: user.education || '',
      occupation: user.occupation || '',
      incomeRange: user.incomeRange || '',
      housingStatus: user.housingStatus || '',
      isRealName: user.isRealName || 0,
      isVip: user.isVip || 0,
      lastLoginAt: user.lastLoginAt,
      photos: photosMap.get(user.id) || [],
      isFollowed: followedIds.includes(user.id),
      matchmakerComment: commentsMap.get(user.id) || '',
    }))

    const result: PaginatedResult<RecommendListItem> = {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }

    // 8. 写入 Redis 缓存
    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL.recommendList)

    return result
  }

  /**
   * 清除与指定用户相关的推荐缓存
   * 用户资料更新 / 置顶状态变更 / 会员状态变更时调用
   */
  async invalidateUserCache(userId: number): Promise<void> {
    // 直接删除该用户的推荐分缓存
    await this.redis.del(`recommend:score:${userId}`)
    // 列表缓存 key 模式太多无法精确清理，靠 TTL 自然过期
    // 如果用户城市已知，可以主动清该城市首页：
    const user = await this.userRepository.findOne({ where: { id: userId }, select: ['residence'] })
    if (user?.residence) {
      const city = this.extractCity(user.residence)
      await this.invalidateCityCache(city)
    }
  }

  /**
   * 清除指定城市的所有推荐列表缓存
   */
  async invalidateCityCache(city: string): Promise<void> {
    const keys = await this.redis.getClient().keys(`recommend:list:${city}:*`)
    if (keys.length > 0) {
      await Promise.all(keys.map(k => this.redis.del(k)))
    }
  }

  // ========================================================================
  //  推荐分计算
  // ========================================================================

  /**
   * 计算单个用户的推荐分（带 Redis 缓存）
   */
  async getUserScore(user: User): Promise<number> {
    const cacheKey = `recommend:score:${user.id}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return Number(cached)

    const now = Date.now()
    let score = 0

    // 1. 活跃度分 (0~100)
    score += WEIGHTS.activity * this.calcActivityScore(user.lastActiveAt)

    // 2. 资料完整度分 (0~100)
    score += WEIGHTS.profile * (user.profileScore || 0)

    // 3. 运营手动加权分（直接累加，无上限）
    score += WEIGHTS.manualBoost * (user.manualBoostScore || 0)

    // 4. 会员权重分
    score += WEIGHTS.vip * this.calcVipScore(user.isVip, user.vipLevel)

    // 5. 新用户保护分
    score += WEIGHTS.newUser * this.calcNewUserScore(user.createdAt)

    // 取整
    const finalScore = Math.round(score)
    await this.redis.set(cacheKey, String(finalScore), CACHE_TTL.userScore)
    return finalScore
  }

  private buildScoreExpression(): string {
    // 在 SQL 中构建推荐分表达式（用于排序）
    // 避免逐条查 Redis 性能问题，直接用数据库字段计算
    return `
      (${WEIGHTS.activity} * CASE
        WHEN TIMESTAMPDIFF(HOUR, COALESCE(user.lastActiveAt, user.createdAt), NOW()) <= 24 THEN 100
        WHEN TIMESTAMPDIFF(DAY, COALESCE(user.lastActiveAt, user.createdAt), NOW()) <= 7 THEN 80
        WHEN TIMESTAMPDIFF(DAY, COALESCE(user.lastActiveAt, user.createdAt), NOW()) <= 30 THEN 50
        ELSE 15
      END
      + ${WEIGHTS.profile} * COALESCE(user.profileScore, 0)
      + ${WEIGHTS.manualBoost} * COALESCE(user.manualBoostScore, 0)
      + ${WEIGHTS.vip} * (CASE WHEN user.isVip = 1 THEN COALESCE(user.vipLevel, 1) * 15 ELSE 0 END)
      + ${WEIGHTS.newUser} * (CASE WHEN TIMESTAMPDIFF(DAY, user.createdAt, NOW()) <= 7 THEN 80 ELSE 0 END))
    `
  }


  // ========================================================================
  //  置顶逻辑
  // ========================================================================

  /**
   * 获取当前应该置顶的用户列表
   * 规则：
   * 1. 筛选 pinnedExpireAt > now 的用户
   * 2. 受性别、城市等基础条件约束
   * 3. 按 manualBoostScore 降序取前 N 个
   * 4. 前端无感知，无任何角标/标签
   */
  private async getPinnedUsers(
    city: string,
    targetGender: number,
    currentUserId?: number,
    filters?: RecommendFilters,
  ): Promise<User[]> {
    const qb = this.baseSelectQuery()
    qb.andWhere('user.pinnedExpireAt IS NOT NULL')
    qb.andWhere('user.pinnedExpireAt > :now', { now: new Date() })
    qb.andWhere('user.status = :status', { status: 1 })
    qb.andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })

    // 性别过滤
    if (Number.isFinite(targetGender) && targetGender >= 1 && targetGender <= 2) {
      qb.andWhere('user.gender = :gender', { gender: targetGender })
    }

    // 排除自己
    if (currentUserId) {
      qb.andWhere('user.id != :selfId', { selfId: currentUserId })
    }

    // 曝光池：置顶用户也要受城市约束
    this.applyExposurePoolFilter(qb, city)

    // 应用筛选条件
    this.applyFilters(qb, filters)

    // 额外确保实名筛选对置顶用户同样生效（防御性编程）
    if (filters?.isRealName === 1) {
      qb.andWhere('user.isRealName = :pinRn', { pinRn: 1 })
    }

    qb.orderBy('user.manualBoostScore', 'DESC')
    qb.take(PIN_CONFIG.maxPinnedSlots)

    return qb.getMany()
  }


  // ========================================================================
  //  曝光池控制
  // ========================================================================

  /**
   * 在查询构建器上施加曝光池城市约束
   * - city:      仅同城（residence LIKE '%city%'）
   * - province:  同城 + 同省
   * - national:  无城市限制
   */
  private applyExposurePoolFilter(qb: ReturnType<typeof this.baseSelectQuery>, city: string): void {
    if (!city) return

    qb.andWhere(
      `(
        (user.exposurePool = 'national')
        OR (user.exposurePool = 'city' AND user.residence LIKE :cityLike)
        OR (user.exposurePool = 'province')
      )`,
      { cityLike: `%${city}%` },
    )
    // province 用户不强制 residence 匹配，依赖城市名 + 省后缀模糊匹配
    // 如果 city 传入的是具体城市名如"杭州"，province 用户通过 residence 中含浙江省被自然包含
  }

  // ========================================================================
  //  内部工具方法
  // ========================================================================

  private baseSelectQuery() {
    return this.userRepository
      .createQueryBuilder('user')
      .select(RecommendService.userSelect.map(f => `user.${f}`))
  }

  private buildBaseQuery(
    city: string,
    targetGender: number,
    currentUserId?: number,
    filters?: RecommendFilters,
  ) {
    const qb = this.baseSelectQuery()
    qb.where('user.status = :status', { status: 1 })
    qb.andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })

    if (currentUserId) {
      qb.andWhere('user.id != :selfId', { selfId: currentUserId })
    }

    if (Number.isFinite(targetGender) && targetGender >= 1 && targetGender <= 2) {
      qb.andWhere('user.gender = :gender', { gender: targetGender })
    }

    this.applyExposurePoolFilter(qb, city)
    this.applyFilters(qb, filters)

    return qb
  }

  private applyFilters(qb: ReturnType<typeof this.baseSelectQuery>, filters?: RecommendFilters): void {
    if (!filters) return

    if (filters.ageMin !== undefined && Number.isFinite(filters.ageMin)) {
      const maxBirthYear = new Date().getFullYear() - filters.ageMin!
      qb.andWhere('user.birthYear <= :maxBy', { maxBy: maxBirthYear })
    }
    if (filters.ageMax !== undefined && Number.isFinite(filters.ageMax)) {
      const minBirthYear = new Date().getFullYear() - filters.ageMax!
      qb.andWhere('user.birthYear >= :minBy', { minBy: minBirthYear })
    }
    if (filters.heightMin && Number.isFinite(filters.heightMin)) {
      qb.andWhere('user.height >= :hMin', { hMin: filters.heightMin })
    }
    if (filters.heightMax && Number.isFinite(filters.heightMax)) {
      qb.andWhere('user.height <= :hMax', { hMax: filters.heightMax })
    }
    if (filters.education) {
      const levels = ['高中', '大专', '本科', '硕士', '博士']
      const idx = levels.indexOf(filters.education)
      if (idx !== -1) {
        qb.andWhere('user.education IN (:...edus)', { edus: levels.slice(idx) })
      }
    }
    if (filters.incomeRange) {
      qb.andWhere('user.incomeRange = :inc', { inc: filters.incomeRange })
    }
    if (filters.maritalStatus) {
      qb.andWhere('user.maritalStatus = :ms', { ms: filters.maritalStatus })
    }
    if (filters.isRealName !== undefined && filters.isRealName !== null && (filters.isRealName === 0 || filters.isRealName === 1)) {
      qb.andWhere('user.isRealName = :rn', { rn: filters.isRealName })
    }
    if (filters.residence) {
      qb.andWhere('user.residence LIKE :res', { res: `%${filters.residence}%` })
    }
    if (filters.hometown) {
      qb.andWhere('user.hometown LIKE :ht', { ht: `%${filters.hometown}%` })
    }
    if (filters.keyword) {
      qb.andWhere('user.nickname LIKE :kw', { kw: `%${filters.keyword}%` })
    }
  }

  // ---- 评分子维度 ----

  /** 活跃度分: 0-100 */
  private calcActivityScore(lastActiveAt: Date | null): number {
    if (!lastActiveAt) return 15
    const hours = (Date.now() - lastActiveAt.getTime()) / 3_600_000
    if (hours <= 24) return 100
    if (hours <= 168) return 80   // 7天
    if (hours <= 720) return 50   // 30天
    return 15
  }

  /** 会员权重分: 基础20 + 等级×15 */
  private calcVipScore(isVip: number, vipLevel: number): number {
    if (!isVip || isVip === 0) return 0
    return 20 + (vipLevel || 1) * 15
  }

  /** 新用户保护分: 7天内80分，否则0 */
  private calcNewUserScore(createdAt: Date): number {
    if (!createdAt) return 0
    const days = (Date.now() - createdAt.getTime()) / 86_400_000
    return days <= 7 ? 80 : 0
  }

  // ---- 缓存 ----

  private buildListCacheKey(
    city: string, page: number, pageSize: number,
    targetGender: number, currentUserId?: number,
    filters?: RecommendFilters,
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : ''
    return `v${CACHE_VERSION}:recommend:list:${city}:${targetGender}:p${page}s${pageSize}:u${currentUserId || 0}:${filterStr.slice(0,64)}`
  }

  private extractCity(residence: string): string {
    // residence 格式: "浙江省/杭州市/西湖区"，取第二段
    const parts = residence.split('/')
    return parts[1] || parts[0] || ''
  }

  // ---- 关联数据批量查询 ----

  private async getPhotosMap(userIds: number[]): Promise<Map<number, string[]>> {
    if (userIds.length === 0) return new Map()
    const photos = await this.photoRepository.find({
      where: { userId: In(userIds), isMain: 1 },
      order: { sortOrder: 'ASC' },
    })
    const map = new Map<number, string[]>()
    for (const p of photos) {
      const arr = map.get(p.userId) || []
      arr.push(p.photoUrl)
      map.set(p.userId, arr)
    }
    return map
  }

  private async getCommentsMap(userIds: number[]): Promise<Map<number, string>> {
    if (userIds.length === 0) return new Map()
    const comments = await this.commentRepo
      .createQueryBuilder('c')
      .select('c.userId', 'userId')
      .addSelect('c.content', 'content')
      .where('c.userId IN (:...ids)', { ids: userIds })
      .andWhere('c.status = :status', { status: 1 })
      .orderBy('c.createdAt', 'DESC')
      .getRawMany<{ userId: number; content: string }>()
    const map = new Map<number, string>()
    for (const c of comments) {
      if (!map.has(Number(c.userId))) {
        map.set(Number(c.userId), c.content)
      }
    }
    return map
  }
}
