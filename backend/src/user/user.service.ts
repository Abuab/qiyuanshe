import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as crypto from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { ContentFilterService } from '../common/content-filter.service'
import { Repository, SelectQueryBuilder, In, DataSource } from 'typeorm'
import { User, UserPhoto, UserNotification } from '../entities'
import { Follow } from '../entities/Follow'
import { UserBlock } from '../entities/UserBlock'
import { ProfileVisit } from '../entities/ProfileVisit'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { AuditLog } from '../entities/AuditLog'
import { UserAgreement } from '../entities/UserAgreement'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { SystemService } from '../system/system.service'
import { RecommendService, RecommendFilters } from './recommend.service'
import { AgreementLogStorageService } from '../agreement-log-storage/agreement-log-storage.service'
import { calcProfileScore } from '../common/profile-score'
import { getDisplayName } from '../common/user-utils'
import { normalizeImageUrl, resolveStaticUrl, resolveAvatarUrl } from '../common/image-url'
import { AiVoiceService } from '../ai/ai-voice.service'
import { LicenseService } from '../license/license.service'
import { NotifyChannelService } from '../admin/notify-channel.service'
import { beijingISO } from '../common/utils/date-utils'

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UserListItem {
  id: number
  userId: string
  nickname: string
  displayName: string
  avatar: string
  age: number
  height: number
  education: string
  occupation: string
  incomeRange: string
  housingStatus: string
  isRealName: number
  isVip: number
  lastLoginAt: Date
  photos: string[]
  isFollowed: boolean
  matchmakerComment?: string
  followedAt?: Date | null
}

/** 系统预置职业列表，来自选择器而非用户自由输入，跳过内容过滤 */
const KNOWN_OCCUPATIONS = new Set([
  '事业编', '中学老师', '小学老师', '幼师', '服务行业', '保险', '老师', '药剂师',
  '设计', '运营', '个体工商户', '普通职员', '银行', '工程', '财务', '技术',
  '餐饮', '体制内', '事业单位', '销售', '公务员', '国企职员', '工程师', '银行职员',
  '个体户', '老板创业者', '公司职员', '公司高管', '律师', '设计师', 'IT从业者', '客服', '人事',
  '财务会计', '军人', '服务业', '教师', '医生', '护士', '警察', '其他',
])

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(UserBlock)
    private readonly blockRepository: Repository<UserBlock>,
    @InjectRepository(ProfileVisit)
      private readonly visitRepository: Repository<ProfileVisit>,
      @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserAgreement)
    private readonly agreementRepo: Repository<UserAgreement>,
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
    private readonly systemService: SystemService,
    private readonly recommendService: RecommendService,
    private readonly agreementLogStorage: AgreementLogStorageService,
    private readonly aiVoiceService: AiVoiceService,
    private readonly notifyService: NotifyChannelService,
    private readonly dataSource: DataSource,
    private readonly contentFilter: ContentFilterService,
    private readonly licenseService: LicenseService,
  ) {}

  /**
   * 推荐列表 - 委托给 RecommendService
   */
  async findRecommend(
    city: string,
    page: number = 1,
    limit: number = 10,
    targetGender: number,
    currentUserId?: number,
    filters?: RecommendFilters,
  ) {
    // 未登录用户：显示所有性别（不限制）
    // 已登录但未指定性别：自动按性别互推（男→女，女→男）
    let effectiveGender = targetGender
    if (!effectiveGender && currentUserId) {
      const currentUser = await this.userRepository.findOne({
        where: { id: currentUserId },
        select: ['gender'],
      })
      if (currentUser) {
        if (currentUser.gender === 1) effectiveGender = 2      // 男→女
        else if (currentUser.gender === 2) effectiveGender = 1 // 女→男
      }
    }

    return this.recommendService.getRecommendList(
      city, page, limit, effectiveGender, currentUserId, filters,
    )
  }

  /**
   * 用户资料更新后清除推荐缓存
   */
  async onProfileUpdated(userId: number): Promise<void> {
    await this.recommendService.invalidateUserCache(userId)
  }

  /**
   * 生成 6 位唯一数字 userId（范围 100000~999999）
   */
  async generateUserId(): Promise<string> {
    const MAX_RETRIES = 10
    for (let i = 0; i < MAX_RETRIES; i++) {
      const num = crypto.randomInt(100000, 1000000)
      const userId = String(num)
      const exists = await this.userRepository.findOne({ where: { userId }, select: ['id'] })
      if (!exists) return userId
    }
    // 6位池接近耗尽，扩展到7位
    for (let i = 0; i < MAX_RETRIES; i++) {
      const num = crypto.randomInt(1000000, 10000000)
      const userId = String(num)
      const exists = await this.userRepository.findOne({ where: { userId }, select: ['id'] })
      if (!exists) return userId
    }
    throw new Error('无法生成唯一 userId，ID池已耗尽')
  }

  /**
   * 根据用户标签 + 后台配置的模板拼成一句话简介。
   * 默认模板：「我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}」
   * 配置 key：intro.template / intro.separator / intro.emptyPlaceholder
   */
  async buildUserIntroText(user: User): Promise<string> {
    // 读取配置
    const rawTemplate = await this.systemService.getConfig('intro.template')
    const template = rawTemplate || '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}'
    const sep = (await this.systemService.getConfig('intro.separator')) || '、'
    const empty = (await this.systemService.getConfig('intro.emptyPlaceholder')) || '（暂未填写）'

    // 提取标签值
    const values: Record<string, string[]> = {
      character: [],
      hobby: [],
      loveRule: [],
      hopeTa: [],
    }

    const pt = (user as any).personalityTags
    if (pt && typeof pt === 'object' && !Array.isArray(pt)) {
      if (Array.isArray(pt.character)) values.character = pt.character
      if (Array.isArray(pt.hobby)) values.hobby = pt.hobby
      if (Array.isArray(pt.loveRule)) values.loveRule = pt.loveRule
    } else if (Array.isArray(pt)) {
      values.character = pt
    }

    const ht = (user as any).hopeTaTags
    if (Array.isArray(ht)) values.hopeTa = ht

    // 变量替换
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
      const tags = values[key]
      if (tags && tags.length > 0) return tags.join(sep)
      return empty
    })
  }

  async getUserDetail(
    id: number,
    currentUserId?: number,
  ): Promise<{
    user: Partial<User> & {
      photos: any[]
      matchmakerReviews: { id: number; content: string; matchmakerName: string; createdAt: Date }[]
      isFollowed: boolean
      isSelf: boolean
      isBlockedByTarget: boolean
      hasBlocked: boolean
      introText: string
      displayName: string
    }
  }> {
    const user = await this.userRepository.findOne({
      where: {
        id,
        isDeleted: 0,
        // 本人查看放宽 status（未完善资料的新用户也能看自己）；他人查看仍仅展示 NORMAL
        ...(currentUserId === id ? {} : { status: 1 }),
      },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    // 照片单独按 sortOrder 排序查询（findOne 的 relations 无法保证顺序）
    const photos = await this.userPhotoRepository.find({
      where: { userId: id },
      order: { sortOrder: 'ASC' },
    })

    // 非本人查看时仅展示已审核通过的照片
    const isSelfView = currentUserId === id
    const visiblePhotos = isSelfView ? photos : photos.filter(p => p.auditStatus === 1)

    const userPhotos = visiblePhotos.map((p, i) => ({
      id: p.id,
      url: p.photoUrl,
      sortOrder: p.sortOrder,
      isFirst: i === 0,
      needLogin: !isSelfView && i > 0,
      isBlurred: !isSelfView && i > 0,
    }))

    // 若头像不在已审核照片中，将其作为第一张照片插入
    if (user.avatar) {
      const avatarInPhotos = visiblePhotos.some(p => p.photoUrl === user.avatar)
      if (!avatarInPhotos) {
        userPhotos.unshift({
          id: 0,
          url: user.avatar,
          sortOrder: 0,
          isFirst: true,
          needLogin: false,
          isBlurred: false,
        })
        // 重新计算所有照片的 isFirst / needLogin / isBlurred
        // avatar 前置后原始第一张照片滑到 index=1，权限标记也需要同步更新
        userPhotos.forEach((item, index) => {
          item.isFirst = index === 0
          item.needLogin = !isSelfView && index > 0
          item.isBlurred = !isSelfView && index > 0
        })
      }
    }

    let isFollowed = false
    let isSelf = false
    let isBlockedByTarget = false
    let hasBlocked = false

    if (currentUserId) {
      isSelf = currentUserId === id
      if (!isSelf) {
        // 记录来访
        this.visitRepository.save(
          this.visitRepository.create({ userId: id, visitorUserId: currentUserId }),
        ).catch((err) => this.logger.error('Record visit error:', err?.message || err))

        // 更新访问者的最后活跃时间
        this.userRepository.update(currentUserId, { lastActiveAt: new Date() })
          .catch((err) => this.logger.error('Update lastActiveAt error:', err?.message || err))

        const follow = await this.followRepository.findOne({
          where: { userId: currentUserId, targetUserId: id },
        })
        isFollowed = !!follow

        // ===== 拉黑状态检查 =====
        const [blockedByTarget, blockedByMe] = await Promise.all([
          this.blockRepository.findOne({
            where: { blockerId: id, blockedUserId: currentUserId },
          }),
          this.blockRepository.findOne({
            where: { blockerId: currentUserId, blockedUserId: id },
          }),
        ])
        isBlockedByTarget = !!blockedByTarget
        hasBlocked = !!blockedByMe
      }
    }

    // 获取红娘评语
    const reviews = await this.commentRepo.find({
      where: { userId: id, status: 1 },
      relations: ['matchmaker'],
      order: { createdAt: 'DESC' },
    })
    const matchmakerReviews = reviews.map((r) => ({
      id: r.id,
      content: r.content,
      matchmakerName: r.matchmaker?.name || '红娘',
      createdAt: r.createdAt,
    }))

    return {
      user: {
        id: user.id,
        userId: user.userId || '',
        nickname: user.nickname,
        displayName: getDisplayName(user.nickname, user.userId),
        avatar: resolveAvatarUrl(user.avatar),
        gender: user.gender,
        birthYear: user.birthYear,
        height: user.height,
        weight: user.weight,
        education: user.education,
        occupation: user.occupation,
        incomeRange: user.incomeRange,
        housingStatus: user.housingStatus,
        maritalStatus: user.maritalStatus,
        hometown: user.hometown,
        residence: user.residence,
        mateRequirement: user.mateRequirement,
        isRealName: user.isRealName,
        isVip: user.isVip,
        vipLevel: user.vipLevel,
        vipExpireTime: user.vipExpireTime,
        vipPackageName: user.vipPackageName || '',
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        photos: userPhotos as any,
        matchmakerReviews,
        isFollowed,
        isSelf,
        isBlockedByTarget,
        hasBlocked,
        introText: await this.buildUserIntroText(user),
      },
    }
  }

  async followUser(userId: number, targetUserId: number): Promise<void> {
    if (userId === targetUserId) {
      throw new BadRequestException('不能关注自己')
    }

    // 使用事务：同时检查、创建关注记录
    await this.followRepository.manager.transaction(async (manager) => {
      // ===== 拉黑检查：双向阻断 =====
      const blockExists = await manager.findOne(UserBlock, {
        where: [
          { blockerId: userId, blockedUserId: targetUserId },
          { blockerId: targetUserId, blockedUserId: userId },
        ],
      })
      if (blockExists) {
        throw new BadRequestException('无法关注该用户')
      }

      const targetUser = await manager.findOne(User, {
        where: { id: targetUserId, status: 1, isDeleted: 0 },
      })

      if (!targetUser) {
        throw new NotFoundException('用户不存在')
      }

      const existingFollow = await manager.findOne(Follow, {
        where: { userId, targetUserId },
      })

      if (existingFollow) {
        throw new BadRequestException('已关注该用户')
      }

      const follow = manager.create(Follow)
      follow.userId = userId
      follow.targetUserId = targetUserId
      await manager.save(follow)

      // 更新最后活跃时间
      await manager.update(User, userId, { lastActiveAt: new Date() })
    })
  }

  async unfollowUser(userId: number, targetUserId: number): Promise<void> {
    await this.followRepository.manager.transaction(async (manager) => {
      const follow = await manager.findOne(Follow, {
        where: { userId, targetUserId },
      })

      if (!follow) {
        throw new NotFoundException('未关注该用户')
      }

      await manager.remove(follow)
    })
  }

  /**
   * 提醒对方完成实名认证（向对方发送系统通知）
   */
  async remindRealnameVerify(userId: number, targetUserId: number): Promise<{ sent: boolean }> {
    if (userId === targetUserId) {
      throw new BadRequestException('不能提醒自己')
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId, isDeleted: 0 },
    })
    if (!targetUser) {
      throw new NotFoundException('用户不存在')
    }
    if (targetUser.isRealName === 1) {
      throw new BadRequestException('对方已完成实名认证')
    }

    // 24 小时内同一对用户只提醒一次，避免重复打扰
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentNotify = await this.notificationRepository.findOne({
      where: { userId: targetUserId, senderType: 'realname_remind', senderId: userId },
      order: { createdAt: 'DESC' },
    })
    if (recentNotify && recentNotify.createdAt > oneDayAgo) {
      return { sent: false }
    }

    const sender = await this.userRepository.findOne({ where: { id: userId } })
    const senderName = sender?.nickname || '一位用户'

    const notification = this.notificationRepository.create({
      userId: targetUserId,
      title: '实名认证提醒',
      content: `${senderName} 提醒你尽快完成实名认证，认证后可获得更多信任与曝光，认识彼此更安心～`,
      senderType: 'realname_remind',
      senderId: userId,
    })
    await this.notificationRepository.save(notification)

    return { sent: true }
  }

  /** 查询当前用户是否已关注目标用户 */
  async getFollowStatus(
    userId: number,
    targetUserId: number,
  ): Promise<{ isFollowed: boolean }> {
    const follow = await this.followRepository.findOne({
      where: { userId, targetUserId },
    })
    return { isFollowed: !!follow }
  }

  async getFollowers(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<UserListItem>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))
    
    const total = await this.followRepository.count({
      where: { targetUserId: userId },
    })

    const totalPages = Math.ceil(total / pageSize)
    const offset = (pageNum - 1) * pageSize

    const follows = await this.followRepository.find({
      where: { targetUserId: userId },
      skip: offset,
      take: pageSize,
      order: { createdAt: 'DESC' },
    })

    const followerIds = follows.map((f) => f.userId)

    if (followerIds.length === 0) {
      return {
        list: [],
        total,
        page: pageNum,
        pageSize,
        totalPages,
      }
    }

    const users = await this.userRepository.find({
      where: { id: In(followerIds), status: 1, isDeleted: 0 },
    })

    const userIds = users.map((u) => u.id)
    const photosMap = await this.getPhotosMap(userIds)
    const commentsMap = await this.getCommentsMap(userIds)

    // Build follow time map
    const followedAtMap = new Map<number, Date>()
    follows.forEach((f) => {
      if (f.createdAt) followedAtMap.set(f.userId, f.createdAt)
    })

    const list: UserListItem[] = users.map((user) => ({
      id: user.id,
      userId: user.userId || '',
      nickname: user.nickname,
      displayName: getDisplayName(user.nickname, user.userId),
      avatar: resolveAvatarUrl(user.avatar) || '',
      age: this.calculateAge(user.birthYear),
      height: user.height || 0,
      education: user.education || '',
      occupation: user.occupation || '',
      incomeRange: user.incomeRange || '',
      housingStatus: user.housingStatus || '',
      isRealName: user.isRealName || 0,
      isVip: user.isVip || 0,
      lastLoginAt: user.lastLoginAt,
      photos: photosMap.get(user.id) || [],
      isFollowed: false,
      matchmakerComment: commentsMap.get(user.id) || '',
      followedAt: followedAtMap.get(user.id) || null,
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
  }

  async getFollowing(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<UserListItem>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))
    
    const total = await this.followRepository.count({
      where: { userId },
    })

    const totalPages = Math.ceil(total / pageSize)
    const offset = (pageNum - 1) * pageSize

    const follows = await this.followRepository.find({
      where: { userId },
      skip: offset,
      take: pageSize,
      order: { createdAt: 'DESC' },
    })

    const followingIds = follows.map((f) => f.targetUserId)

    if (followingIds.length === 0) {
      return {
        list: [],
        total,
        page: pageNum,
        pageSize,
        totalPages,
      }
    }

    const users = await this.userRepository.find({
      where: { id: In(followingIds), status: 1, isDeleted: 0 },
    })

    const userIds = users.map((u) => u.id)
    const photosMap = await this.getPhotosMap(userIds)
    const commentsMap = await this.getCommentsMap(userIds)

    // Build follow time map (keyed by targetUserId = user id)
    const followedAtMap = new Map<number, Date>()
    follows.forEach((f) => {
      if (f.createdAt) followedAtMap.set(f.targetUserId, f.createdAt)
    })

    const list: UserListItem[] = users.map((user) => ({
      id: user.id,
      userId: user.userId || '',
      nickname: user.nickname,
      displayName: getDisplayName(user.nickname, user.userId),
      avatar: resolveAvatarUrl(user.avatar) || '',
      age: this.calculateAge(user.birthYear),
      height: user.height || 0,
      education: user.education || '',
      occupation: user.occupation || '',
      incomeRange: user.incomeRange || '',
      housingStatus: user.housingStatus || '',
      isRealName: user.isRealName || 0,
      isVip: user.isVip || 0,
      lastLoginAt: user.lastLoginAt,
      photos: photosMap.get(user.id) || [],
      isFollowed: true,
      matchmakerComment: commentsMap.get(user.id) || '',
      followedAt: followedAtMap.get(user.id) || null,
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
  }

  async getUserStats(userId: number) {
    const [following, followers, viewedMe, myViews] = await Promise.all([
      this.followRepository.count({ where: { userId } }),
      this.followRepository.count({ where: { targetUserId: userId } }),
      this.visitRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.visitorUserId)', 'cnt')
        .where('v.userId = :userId', { userId })
        .andWhere('v.visitorUserId != :excludeSelf', { excludeSelf: userId })
        .getRawOne()
        .then(r => Number(r?.cnt) || 0),
      this.visitRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.userId)', 'cnt')
        .where('v.visitorUserId = :userId', { userId })
        .andWhere('v.userId != :excludeSelf2', { excludeSelf2: userId })
        .getRawOne()
        .then(r => Number(r?.cnt) || 0),
    ])
    return { following, followers, footprints: myViews, viewedMe }
  }

  private async getPhotosMap(userIds: number[]): Promise<Map<number, string[]>> {
    const photos = await this.userPhotoRepository.find({
      where: { userId: In(userIds), isMain: 1, auditStatus: 1 },
      order: { sortOrder: 'ASC' },
    })

    const map = new Map<number, string[]>()
    for (const photo of photos) {
      const existing = map.get(photo.userId) || []
      existing.push(photo.photoUrl)
      map.set(photo.userId, existing)
    }

    const allPhotos = await this.userPhotoRepository.find({
      where: { userId: In(userIds), auditStatus: 1 },
      order: { sortOrder: 'ASC' },
    })

    for (const photo of allPhotos) {
      if (!map.has(photo.userId)) {
        map.set(photo.userId, [])
      }
      const existing = map.get(photo.userId)
      if (existing && existing.length < 4 && !existing.includes(photo.photoUrl)) {
        existing.push(photo.photoUrl)
      }
    }

    return map
  }

  private async getCommentsMap(userIds: number[]): Promise<Map<number, string>> {
    if (!userIds.length) return new Map()
    const comments = await this.commentRepo
      .createQueryBuilder('mc')
      .select('mc.userId', 'userId')
      .addSelect('mc.content', 'content')
      .where('mc.userId IN (:...userIds)', { userIds })
      .andWhere('mc.status = 1')
      .andWhere(qb => {
        // 每个用户取最新一条
        const subQuery = qb
          .subQuery()
          .select('MAX(mc2.id)', 'maxId')
          .from('matchmaker_comments', 'mc2')
          .where('mc2.status = 1')
          .groupBy('mc2.userId')
          .getQuery()
        return 'mc.id IN ' + subQuery
      })
      .getRawMany()
    
    const map = new Map<number, string>()
    for (const c of comments) {
      map.set(Number(c.userId), c.content)
    }
    return map
  }

  private calculateAge(birthYear?: number): number {
    if (!birthYear) return 0
    return new Date().getFullYear() - birthYear
  }

  /** 编辑个人资料 */
  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Partial<User>> {
    if (!(await this.licenseService.isActive())) {
      throw new ForbiddenException('系统未授权，该功能暂不可用')
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    // 敏感词过滤 - 用户自定义文本字段
    // 系统默认昵称（格式：昵称+ID）不校验
    if (dto.nickname && !/^昵称\d+$/.test(dto.nickname)) {
      this.contentFilter.checkAndThrow(dto.nickname, '昵称')
    }
    if (dto.wechat) this.contentFilter.checkAndThrow(dto.wechat, '微信号')
    // 职业若来自系统预置列表则跳过校验（非用户自由输入）
    if (dto.occupation && !KNOWN_OCCUPATIONS.has(dto.occupation)) {
      this.contentFilter.checkAndThrow(dto.occupation, '职业')
    }
    // 户籍地/现居地来自省市选择器（非用户自由输入），不做敏感词校验，避免正常地名被大词库误拦

    // 昵称查重：与其他未注销用户重名时拒绝（排除自己、空昵称、未变更的情况）
    if (dto.nickname !== undefined && dto.nickname.trim() !== '' && dto.nickname !== user.nickname) {
      const duplicate = await this.userRepository.findOne({
        where: { nickname: dto.nickname, isDeleted: 0 },
      })
      if (duplicate && duplicate.id !== userId) {
        throw new BadRequestException('该昵称已被使用，请重新填写')
      }
    }

    // 只更新传入的非 undefined 字段
    if (dto.nickname !== undefined) user.nickname = dto.nickname
    if (dto.avatar !== undefined) user.avatar = dto.avatar
    if (dto.avatarReviewStatus !== undefined) user.avatarReviewStatus = dto.avatarReviewStatus
    if (dto.wechat !== undefined) user.wechat = dto.wechat
    if (dto.gender !== undefined) user.gender = dto.gender
    if (dto.birthYear !== undefined) user.birthYear = dto.birthYear
    if (dto.birthMonth !== undefined) user.birthMonth = dto.birthMonth
    if (dto.birthDay !== undefined) user.birthDay = dto.birthDay
    if (dto.height !== undefined) user.height = dto.height
    if (dto.weight !== undefined) user.weight = dto.weight
    if (dto.education !== undefined) user.education = dto.education
    if (dto.occupation !== undefined) user.occupation = dto.occupation
    if (dto.incomeRange !== undefined) user.incomeRange = dto.incomeRange
    if (dto.maritalStatus !== undefined) user.maritalStatus = dto.maritalStatus
    if (dto.hometown !== undefined) user.hometown = dto.hometown
    if (dto.residence !== undefined) user.residence = dto.residence
    if (dto.housingStatus !== undefined) user.housingStatus = dto.housingStatus
    if (dto.carStatus !== undefined) user.carStatus = dto.carStatus
    if (dto.onlyChild !== undefined) user.onlyChild = dto.onlyChild
    if (dto.whenMarry !== undefined) user.whenMarry = dto.whenMarry
    if (dto.zodiac !== undefined) user.zodiac = dto.zodiac
    if (dto.constellation !== undefined) user.constellation = dto.constellation
    if (dto.partnerAgeRange !== undefined) user.partnerAgeRange = dto.partnerAgeRange
    if (dto.partnerHeightMin !== undefined) user.partnerHeightMin = dto.partnerHeightMin
    if (dto.partnerEducation !== undefined) user.partnerEducation = dto.partnerEducation
    if (dto.partnerIncome !== undefined) user.partnerIncome = dto.partnerIncome
    if (dto.housingRequirement !== undefined) user.housingRequirement = dto.housingRequirement
    if (dto.partnerMaritalStatus !== undefined) user.partnerMaritalStatus = dto.partnerMaritalStatus
    if (dto.acceptChildren !== undefined) user.acceptChildren = dto.acceptChildren
    if (dto.voiceUrl !== undefined) {
      // 拒绝微信临时路径：这些路径仅小程序本地有效，服务端和管理后台无法访问
      if (this.isWechatTempPath(dto.voiceUrl)) {
        throw new Error('语音文件未上传，请先上传语音文件')
      }
      // 统一存相对路径（剥离自身域名），迁移域名时无需刷历史数据
      user.voiceUrl = normalizeImageUrl(dto.voiceUrl)
    }
    if (dto.voiceAuditStatus !== undefined) user.voiceAuditStatus = dto.voiceAuditStatus
    if (dto.voiceDuration !== undefined) user.voiceDuration = dto.voiceDuration

    // 语音审核：当 voiceUrl 非空且 voiceAuditStatus 为 0（待审核）时，创建待审核记录
    // 先关闭该用户所有旧的 PENDING 语音审核记录，确保一个用户只有一条有效的 PENDING
    if (dto.voiceUrl && dto.voiceAuditStatus === 0) {
      const relativeVoiceUrl = normalizeImageUrl(dto.voiceUrl)
      await this.auditLogRepository.update(
        { targetType: 'voice', targetId: userId, action: 'PENDING' },
        { action: 'CANCELLED' },
      )
      const newLog = await this.auditLogRepository.save(
        this.auditLogRepository.create({
          targetType: 'voice',
          targetId: userId,
          submitterId: userId,
          action: 'PENDING',
          content: JSON.stringify({
            voiceUrl: relativeVoiceUrl,
            duration: dto.voiceDuration,
          }),
          aiResult: 'AI转录中...',
          aiScore: 0,
        }),
      )

      // AI 转录异步执行，不阻塞 updateProfile HTTP 响应
      this.aiVoiceService.transcribeVoice(relativeVoiceUrl).then((result) => {
        const transcript = result.text
        // aiResult 仅作为摘要展示，完整文本存储在 content.transcript 中
        const maxLen = 500
        const summary = transcript && transcript.length > maxLen ? transcript.slice(0, maxLen) + '...' : transcript
        const aiResult = summary
          ? `AI转录：${summary}`
          : `AI转录失败${result.error ? `（${result.error.length > 200 ? result.error.slice(0, 200) + '...' : result.error}）` : ''}`
        const aiScore = transcript ? 0.85 : 0
        // 更新 content 中的 transcript 字段，供前端展示完整转录文本
        let contentObj: any = {}
        try { contentObj = JSON.parse(newLog.content || '{}') } catch { /* ignore */ }
        contentObj.transcript = transcript
        this.auditLogRepository.update(newLog.id, {
          aiResult,
          aiScore,
          content: JSON.stringify(contentObj),
        }).catch(() => {})
      }).catch(() => {})

      // 发送语音审核通知（参照照片/头像审核流程）
      this.notifyService.sendAuditNotify({
        type: 'voice',
        content: `用户提交了语音介绍审核`,
        userId,
        userNickname: user.nickname || '',
        source: 'voice_upload',
      }).catch(() => {})
    }

    // personalityTags: 支持逗号分隔字符串或数组
    if (dto.personalityTags !== undefined) {
      if (Array.isArray(dto.personalityTags)) {
        user.personalityTags = dto.personalityTags
      } else if (typeof dto.personalityTags === 'string') {
        user.personalityTags = dto.personalityTags.split(',').map(s => s.trim()).filter(Boolean)
      }
    }

    // hopeTaTags: 支持逗号分隔字符串或数组
    if (dto.hopeTaTags !== undefined) {
      if (Array.isArray(dto.hopeTaTags)) {
        user.hopeTaTags = dto.hopeTaTags
      } else if (typeof dto.hopeTaTags === 'string') {
        user.hopeTaTags = dto.hopeTaTags.split(',').map(s => s.trim()).filter(Boolean)
      }
    }

    user.profileScore = calcProfileScore(user)
    user.lastActiveAt = new Date()
    await this.userRepository.save(user)
    // 清除推荐缓存：资料变更可能影响推荐排序和筛选结果
    try { await this.recommendService.invalidateUserCache(userId) } catch (_) {}
    try { await this.recommendService.clearAllListCaches() } catch (_) {}
    // 返回脱敏后的用户信息，不泄露密码哈希、MFA 密钥、微信标识、手机号等敏感字段
    const safeUser = { ...user } as Partial<User>
    delete safeUser.password
    delete safeUser.mfaSecret
    delete safeUser.openid
    delete safeUser.unionId
    delete safeUser.phone
    delete safeUser.eidBizSeqNo
    delete safeUser.tokenVersion
    delete safeUser.refreshTokenVersion
    delete safeUser.adminRemark
    delete safeUser.deleteReason
    delete safeUser.manualBoostScore
    return safeUser
  }

  /** 检测是否为微信临时路径（仅小程序本地有效，不可持久化） */
  private isWechatTempPath(url: string): boolean {
    if (!url) return false
    if (url.startsWith('wxfile://')) return true
    return /^https?:\/\/tmp\//.test(url)
  }

  async getVoiceIntro(userId: number, currentUserId?: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
      select: ['id', 'voiceUrl', 'voiceDuration', 'voiceAuditStatus'],
    })
    if (!user || !user.voiceUrl) return null
    // 未审核通过(0审核中/2拒绝)的语音不对他人展示，仅本人可查看（审核中提示）
    if (user.voiceAuditStatus !== 1 && currentUserId !== userId) {
      return null
    }
    return {
      voiceUrl: resolveStaticUrl(user.voiceUrl),
      duration: user.voiceDuration || 0,
      auditStatus: user.voiceAuditStatus,
    }
  }

  async getVisitors(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<UserListItem>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))

    const total = await this.visitRepository.count({
      where: { userId },
    })

    const totalPages = Math.ceil(total / pageSize)
    const offset = (pageNum - 1) * pageSize

    const visits = await this.visitRepository.find({
      where: { userId },
      relations: ['visitorUser'],
      skip: offset,
      take: pageSize,
      order: { createdAt: 'DESC' },
    })

    const list = visits.map((v) => ({
      id: v.id,
      visitorUserId: v.visitorUserId,
      visitorUser: v.visitorUser
        ? {
            id: v.visitorUser.id,
            userId: v.visitorUser.userId || '',
            nickname: v.visitorUser.nickname,
            displayName: getDisplayName(v.visitorUser.nickname, v.visitorUser.userId),
            avatar: resolveAvatarUrl(v.visitorUser.avatar) || '',
          }
        : null,
      createdAt: v.createdAt,
    }))

    return {
      list: list as any,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
  }

  // ===== 我看过谁（我浏览过的用户列表，去重+计数） =====
  async getMyViews(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<any>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))

    // 子查询：我浏览过的每个用户的最新一次浏览时间（排除已注销用户 & 自身）
    const subQuery = this.visitRepository
      .createQueryBuilder('v')
      .select('v.userId', 'targetUserId')
      .addSelect('MAX(v.createdAt)', 'lastViewedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .innerJoin('v.user', 'u')
      .where('v.visitorUserId = :userId', { userId })
      .andWhere('v.userId != :selfId', { selfId: userId })
      .andWhere('u.isDeleted = :isDel', { isDel: 0 })
      .groupBy('v.userId')

    const total = await this.visitRepository
      .createQueryBuilder('v')
      .select('COUNT(DISTINCT v.userId)', 'cnt')
      .innerJoin('v.user', 'u')
      .where('v.visitorUserId = :userId', { userId })
      .andWhere('v.userId != :selfId2', { selfId2: userId })
      .andWhere('u.isDeleted = :isDel2', { isDel2: 0 })
      .getRawOne()
      .then(r => Number(r?.cnt) || 0)

    const rows = await this.visitRepository.manager
      .createQueryBuilder()
      .select('sub.targetUserId', 'targetUserId')
      .addSelect('sub.lastViewedAt', 'lastViewedAt')
      .addSelect('sub.viewCount', 'viewCount')
      .from(`(${subQuery.getQuery()})`, 'sub')
      .setParameters(subQuery.getParameters())
      .orderBy('sub.lastViewedAt', 'DESC')
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getRawMany()

    const userIds = rows.map(r => Number(r.targetUserId))
    const usersMap = new Map<number, any>()
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: userIds })
        .andWhere('u.isDeleted = :isDel', { isDel: 0 })
        .getMany()
      for (const u of users) usersMap.set(Number(u.id), u)
    }

    const list = rows.map(r => {
      const u = usersMap.get(Number(r.targetUserId))
      return {
        id: Number(r.targetUserId),
        userId: u?.userId || '',
        nickname: u?.nickname || '',
        displayName: getDisplayName(u?.nickname, u?.userId),
        avatar: resolveAvatarUrl(u?.avatar) || '',
        age: u?.birthYear ? new Date().getFullYear() - u.birthYear : null,
        occupation: u?.occupation || '',
        housingStatus: u?.housingStatus || '',
        isRealName: u?.isRealName || 0,
        viewCount: Number(r.viewCount),
        lastViewedAt: r.lastViewedAt,
      }
    })

    return { list, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  // ===== 谁看过我（访客列表，去重+计数） =====
  // type='like' 时仅返回也喜欢（关注）了当前用户的访客
  async getMyVisitorsWithCount(
    userId: number,
    page: number = 1,
    limit: number = 20,
    type?: string,
  ): Promise<PaginatedResult<any>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))
    const onlyLike = type === 'like'

    const subQuery = this.visitRepository
      .createQueryBuilder('v')
      .select('v.visitorUserId', 'visitorUserId')
      .addSelect('MAX(v.createdAt)', 'lastVisitedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .innerJoin('v.visitorUser', 'u')
      .where('v.userId = :userId', { userId })
      .andWhere('v.visitorUserId != :selfId', { selfId: userId })
      .andWhere('u.isDeleted = :isDel', { isDel: 0 })

    if (onlyLike) {
      subQuery
        .innerJoin('follows', 'f', 'f.user_id = v.visitorUserId AND f.target_user_id = v.userId')
    }

    subQuery.groupBy('v.visitorUserId')

    const totalQuery = this.visitRepository
      .createQueryBuilder('v')
      .select('COUNT(DISTINCT v.visitorUserId)', 'cnt')
      .innerJoin('v.visitorUser', 'u')
      .where('v.userId = :userId', { userId })
      .andWhere('v.visitorUserId != :selfId2', { selfId2: userId })
      .andWhere('u.isDeleted = :isDel2', { isDel2: 0 })

    if (onlyLike) {
      totalQuery
        .innerJoin('follows', 'f', 'f.user_id = v.visitorUserId AND f.target_user_id = v.userId')
    }

    const total = await totalQuery
      .getRawOne()
      .then(r => Number(r?.cnt) || 0)

    const rows = await this.visitRepository.manager
      .createQueryBuilder()
      .select('sub.visitorUserId', 'visitorUserId')
      .addSelect('sub.lastVisitedAt', 'lastVisitedAt')
      .addSelect('sub.viewCount', 'viewCount')
      .from(`(${subQuery.getQuery()})`, 'sub')
      .setParameters(subQuery.getParameters())
      .orderBy('sub.lastVisitedAt', 'DESC')
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getRawMany()

    const userIds = rows.map(r => Number(r.visitorUserId))
    const usersMap = new Map<number, any>()
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: userIds })
        .andWhere('u.isDeleted = :isDel', { isDel: 0 })
        .getMany()
      for (const u of users) usersMap.set(Number(u.id), u)
    }

    const list = rows.map(r => {
      const u = usersMap.get(Number(r.visitorUserId))
      return {
        id: Number(r.visitorUserId),
        userId: u?.userId || '',
        nickname: u?.nickname || '',
        displayName: getDisplayName(u?.nickname, u?.userId),
        avatar: resolveAvatarUrl(u?.avatar) || '',
        age: u?.birthYear ? new Date().getFullYear() - u.birthYear : null,
        occupation: u?.occupation || '',
        housingStatus: u?.housingStatus || '',
        isRealName: u?.isRealName || 0,
        viewCount: Number(r.viewCount),
        lastVisitedAt: r.lastVisitedAt,
      }
    })

    return { list, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /** 清理已注销用户的关联数据（问答、报名、关注、喜欢等） */
  public async cleanupDeletedUserData(userId: number): Promise<void> {
    // 每个表显式声明 SQL 和参数；2 个 ? 的绑定 [userId, userId]，1 个 ? 的绑定 [userId]
    const tables: { sql: string; desc: string; params: (userId: number) => any[] }[] = [
      // 关注关系（我关注的 + 关注我的）
      { sql: 'DELETE FROM follows WHERE user_id = ? OR target_user_id = ?', desc: 'follows', params: (id) => [id, id] },
      // 问答
      { sql: 'DELETE FROM answer_likes WHERE userId = ?', desc: 'answer_likes', params: (id) => [id] },
      { sql: `DELETE al FROM answer_likes al INNER JOIN question_answers qa ON al.answerId = qa.id WHERE qa.userId = ?`, desc: 'answer_likes_on_own_answers', params: (id) => [id] },
      { sql: 'DELETE FROM question_answers WHERE userId = ?', desc: 'question_answers', params: (id) => [id] },
      // 动态
      { sql: 'DELETE FROM dynamic_likes WHERE userId = ?', desc: 'dynamic_likes', params: (id) => [id] },
      { sql: `DELETE dl FROM dynamic_likes dl INNER JOIN dynamics d ON dl.dynamicId = d.id WHERE d.userId = ?`, desc: 'dynamic_likes_on_own', params: (id) => [id] },
      { sql: 'DELETE FROM dynamics WHERE userId = ?', desc: 'dynamics', params: (id) => [id] },
      // 活动报名
      { sql: 'DELETE FROM activity_signups WHERE userId = ?', desc: 'activity_signups', params: (id) => [id] },
      // 照片
      { sql: 'DELETE FROM user_photos WHERE userId = ?', desc: 'user_photos', params: (id) => [id] },
      // 浏览记录
      { sql: 'DELETE FROM profile_visits WHERE user_id = ? OR visitor_user_id = ?', desc: 'profile_visits', params: (id) => [id, id] },
      // 聊天消息
      { sql: 'DELETE FROM chat_messages WHERE fromUserId = ? OR toUserId = ?', desc: 'chat_messages', params: (id) => [id, id] },
      // 匹配记录
      { sql: 'DELETE FROM match_records WHERE userId = ? OR matchedUserId = ?', desc: 'match_records', params: (id) => [id, id] },
      // 圈子
      { sql: 'DELETE FROM circle_members WHERE userId = ?', desc: 'circle_members', params: (id) => [id] },
      // 拉黑
      { sql: 'DELETE FROM user_blocks WHERE blockerId = ? OR blockedUserId = ?', desc: 'user_blocks', params: (id) => [id, id] },
      // 红娘评价
      { sql: 'DELETE FROM matchmaker_reviews WHERE userId = ?', desc: 'matchmaker_reviews', params: (id) => [id] },
      // 反馈
      { sql: 'DELETE FROM feedbacks WHERE userId = ?', desc: 'feedbacks', params: (id) => [id] },
      // 通知
      { sql: 'DELETE FROM user_notifications WHERE userId = ?', desc: 'user_notifications', params: (id) => [id] },
      // 认证
      { sql: 'DELETE FROM user_auths WHERE userId = ?', desc: 'user_auths', params: (id) => [id] },
      // 标签
      { sql: 'DELETE FROM user_tag_selections WHERE userId = ?', desc: 'user_tag_selections', params: (id) => [id] },
      // 协议
      { sql: 'DELETE FROM user_agreements WHERE userId = ?', desc: 'user_agreements', params: (id) => [id] },
      // VIP — 软删除保留订单记录，满足财务对账/税务核查/退款纠纷追溯需求
      { sql: 'UPDATE vip_orders SET isDeleted = 1 WHERE userId = ?', desc: 'vip_orders', params: (id) => [id] },
      // 置顶
      { sql: 'DELETE FROM user_top_records WHERE userId = ?', desc: 'user_top_records', params: (id) => [id] },
      { sql: 'DELETE FROM user_top_card_quotas WHERE userId = ?', desc: 'user_top_card_quotas', params: (id) => [id] },
      // 红线
      { sql: 'DELETE FROM user_red_line_quotas WHERE userId = ?', desc: 'user_red_line_quotas', params: (id) => [id] },
      { sql: 'DELETE FROM user_red_line_usage_records WHERE userId = ? OR targetUserId = ?', desc: 'user_red_line_usage_records', params: (id) => [id, id] },
      { sql: 'DELETE FROM red_line_usages WHERE userId = ? OR targetUserId = ?', desc: 'red_line_usages', params: (id) => [id, id] },
      // AI
      { sql: 'DELETE FROM ai_user_profiles WHERE userId = ?', desc: 'ai_user_profiles', params: (id) => [id] },
      { sql: 'DELETE FROM ai_call_logs WHERE userId = ?', desc: 'ai_call_logs', params: (id) => [id] },
      // 承诺
      { sql: 'DELETE FROM single_promises WHERE userId = ?', desc: 'single_promises', params: (id) => [id] },
      // 人格测试
      { sql: 'DELETE FROM personality_answer_records WHERE userId = ?', desc: 'personality_answer_records', params: (id) => [id] },
      { sql: 'DELETE FROM personality_results WHERE userId = ?', desc: 'personality_results', params: (id) => [id] },
      // AI问答报告
      { sql: 'DELETE FROM ai_fun_quiz_reports WHERE userId = ?', desc: 'ai_fun_quiz_reports', params: (id) => [id] },
      // 红娘评语
      { sql: 'DELETE FROM matchmaker_comments WHERE userId = ?', desc: 'matchmaker_comments', params: (id) => [id] },
      // AI缘分匹配报告
      { sql: 'DELETE FROM ai_match_reports WHERE userId = ? OR targetUserId = ?', desc: 'ai_match_reports', params: (id) => [id, id] },
      // 审核日志（用户提交的审核记录）
      { sql: 'DELETE FROM audit_logs WHERE submitterId = ? OR (targetType IN (\'voice\',\'avatar\',\'user\',\'user_cancel\') AND targetId = ?)', desc: 'audit_logs', params: (id) => [id, id] },
      // 举报记录
      { sql: 'DELETE FROM reports WHERE reporterId = ? OR (type = \'user\' AND targetId = ?)', desc: 'reports', params: (id) => [id, id] },
      // 协议操作日志
      { sql: 'DELETE FROM user_agreement_logs WHERE userId = ?', desc: 'user_agreement_logs', params: (id) => [id] },
      // AI提供商调用日志
      { sql: 'DELETE FROM ai_provider_call_logs WHERE userId = ?', desc: 'ai_provider_call_logs', params: (id) => [id] },
    ]

    // 逐表清理：每个表独立执行，一个失败不影响其他表
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    let failedTables: string[] = []

    for (const { sql, desc, params } of tables) {
      try {
        await queryRunner.query(sql, params(userId))
      } catch (err: any) {
        this.logger.warn(`用户 ${userId} 清理 ${desc} 失败: ${err?.message || err}`)
        failedTables.push(desc)
      }
    }

    // 标记 real_name_identities 状态为已注销（保留哈希用于后续去重）
    try {
      await queryRunner.query(
        'UPDATE real_name_identities SET status = 1 WHERE userId = ?',
        [userId],
      )
    } catch (err: any) {
      this.logger.warn(`用户 ${userId} 标记 real_name_identities 失败: ${err?.message || err}`)
    }

    await queryRunner.release()

    // 清除推荐缓存（包括列表缓存，确保已注销用户不出现在推荐流中）
    try { await this.recommendService.invalidateUserCache(userId) } catch (_) {}
    try { await this.recommendService.clearAllListCaches() } catch (_) {}

    if (failedTables.length === 0) {
      this.logger.log(`用户 ${userId} 注销：已清理关联数据`)
    } else {
      this.logger.warn(`用户 ${userId} 注销：部分表清理失败 (${failedTables.join(', ')})，其余已清理`)
    }
  }

  /** 注销账号（含审计日志），统一入口。
   *  reason: 'self' = 小程序端自行注销, 'revoke' = 撤回协议同意导致注销 */
  async cancelAccount(userId: number, reason: 'self' | 'revoke' = 'self'): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在')
    if (user.isDeleted === 1) return // 已注销，幂等

    const oldPhone = user.phone
    user.isDeleted = 1
    user.status = 0
    user.deleteReason = reason === 'revoke' ? '撤回协议同意' : '用户自行注销'
    user.phone = null          // 释放手机号
    user.tokenVersion += 1     // 使所有已签发 accessToken 失效
    user.refreshTokenVersion += 1 // 使所有已签发 refreshToken 失效
    await this.userRepository.save(user)

    // 写入审计日志
    await this.auditLogRepository.save({
      targetType: 'user_cancel',
      targetId: userId,
      action: reason === 'revoke' ? 'REVOKE_AGREEMENT' : 'CANCEL',
      reason: reason === 'revoke' ? '撤回协议同意导致注销' : '用户主动注销',
      content: JSON.stringify({
        nickname: user.nickname,
        phone: oldPhone,
        canceledAt: beijingISO(),
      }),
    })

    // 同步清理关联数据，避免未清理完就被用户重新注册导致旧数据残留
    await this.cleanupDeletedUserData(userId)
  }

  /** 查询我喜欢/喜欢我/互相喜欢的人列表 */
  async getMyLikes(
    userId: number,
    type: 'liked' | 'likedBy' | 'mutual',
  ): Promise<{ id: number; nickname: string; avatar: string; age: number; gender: number; location: string; createdAt: Date; isMutual?: boolean }[]> {
    if (type === 'liked') {
      const follows = await this.followRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      })
      return this.mapLikesToUsers(follows, 'targetUserId')
    }

    if (type === 'likedBy') {
      const follows = await this.followRepository.find({
        where: { targetUserId: userId },
        order: { createdAt: 'DESC' },
      })
      const list = await this.mapLikesToUsers(follows, 'userId')
      // 标记哪些用户已经被当前用户回喜欢了（双向喜欢）
      if (list.length > 0) {
        const likedBackIds = new Set(
          (await this.followRepository.find({
            where: { userId, targetUserId: In(list.map(u => u.id)) },
            select: ['targetUserId'],
          })).map(f => f.targetUserId),
        )
        list.forEach(u => { u.isMutual = likedBackIds.has(u.id) })
      }
      return list
    }

    // mutual: 互相喜欢
    const myLikes = await this.followRepository.find({
      where: { userId },
    })
    if (myLikes.length === 0) return []

    const myLikeTargetIds = myLikes.map((f) => f.targetUserId)
    const mutualFollows = await this.followRepository.find({
      where: { userId: In(myLikeTargetIds), targetUserId: userId },
      order: { createdAt: 'DESC' },
    })

    return this.mapLikesToUsers(mutualFollows, 'userId')
  }

  private async mapLikesToUsers(
    follows: Follow[],
    userField: 'userId' | 'targetUserId',
  ): Promise<{ id: number; userId: string; nickname: string; displayName: string; avatar: string; age: number; gender: number; location: string; createdAt: Date; isMutual?: boolean }[]> {
    if (follows.length === 0) return []

    const userIds = follows.map((f) => f[userField])
    const users = await this.userRepository.find({
      where: { id: In(userIds), status: 1, isDeleted: 0 },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))
    const createdAtMap = new Map<number, Date>()
    follows.forEach((f) => {
      const uid = f[userField] as number
      if (!createdAtMap.has(uid)) {
        createdAtMap.set(uid, f.createdAt)
      }
    })

    return userIds
      .map((uid) => {
        const user = userMap.get(uid)
        if (!user) return null
        return {
          id: user.id,
          userId: user.userId || '',
          nickname: user.nickname,
          displayName: getDisplayName(user.nickname, user.userId),
          avatar: resolveAvatarUrl(user.avatar) || '',
          age: this.calculateAge(user.birthYear),
          gender: user.gender,
          location: user.residence || user.hometown || '',
          createdAt: createdAtMap.get(uid) || new Date(),
        }
      })
      .filter(Boolean) as { id: number; userId: string; nickname: string; displayName: string; avatar: string; age: number; gender: number; location: string; createdAt: Date }[]
  }

  /** 记录用户协议同意/不同意（按 userId + agreementType 去重，再次同意时只更新版本和时间） */
  async recordAgreement(
    userId: number,
    agreementType: string,
    version: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 查找已有记录，存在则更新，不存在则创建
    const existing = await this.agreementRepo.findOne({
      where: { userId, agreementType },
    })
    if (existing) {
      existing.version = version
      existing.action = action
      existing.ipAddress = ipAddress || null
      await this.agreementRepo.save(existing)
    } else {
      const agreement = this.agreementRepo.create({
        userId,
        agreementType,
        version,
        action,
        ipAddress: ipAddress || null,
      })
      await this.agreementRepo.save(agreement)
    }

    // 同步写入 AgreementLogStorage，确保管理后台"同意记录查询"可查到（日志始终追加）
    this.agreementLogStorage.saveLog({
      userId,
      agreementType,
      version,
      action,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
    }).catch(err => this.logger.error('[user] saveLog failed:', err?.message || err))

    // 同步更新 User 表中的最近同意时间与版本
    if (action === 'agree') {
      await this.userRepository.update(userId, {
        protocolAgreedAt: new Date(),
        protocolVersion: version,
      })
    } else if (action === 'revoke') {
      // 撤回同意协议：与注销账户走相同逻辑，彻底清除用户数据并从推荐列表移除
      await this.cancelAccount(userId, 'revoke')
      // cancelAccount 已含审计日志，此处补充清空协议字段
      await this.userRepository.update(userId, { protocolAgreedAt: null })
    }
  }
}
