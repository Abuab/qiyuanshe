import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder, In } from 'typeorm'
import { User, UserPhoto } from '../entities'
import { Follow } from '../entities/Follow'
import { ProfileVisit } from '../entities/ProfileVisit'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { AuditLog } from '../entities/AuditLog'
import { UserAgreement } from '../entities/UserAgreement'
import { FilterUsersDto } from './dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { SystemService } from '../system/system.service'
import { RecommendService, RecommendFilters } from './recommend.service'
import { AgreementLogStorageService } from '../agreement-log-storage/agreement-log-storage.service'
import { calcProfileScore } from '../common/profile-score'
import { AiVoiceService } from '../ai/ai-voice.service'
import { NotifyChannelService } from '../admin/notify-channel.service'

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UserListItem {
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
  lastLoginAt: Date
  photos: string[]
  isFollowed: boolean
  matchmakerComment?: string
  followedAt?: Date | null
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(ProfileVisit)
      private readonly visitRepository: Repository<ProfileVisit>,
      @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserAgreement)
    private readonly agreementRepo: Repository<UserAgreement>,
    private readonly systemService: SystemService,
    private readonly recommendService: RecommendService,
    private readonly agreementLogStorage: AgreementLogStorageService,
    private readonly aiVoiceService: AiVoiceService,
    private readonly notifyService: NotifyChannelService,
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

  async filterUsers(
    dto: FilterUsersDto,
    currentUserId?: number,
  ): Promise<PaginatedResult<UserListItem>> {
    const { page = 1, limit = 10 } = dto
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 10))
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 1 })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })
      .andWhere('user.id != :adminId', { adminId: 1 })

    if (dto.gender !== undefined && dto.gender !== null) {
      const genderNum = Number(dto.gender)
      if (Number.isFinite(genderNum) && genderNum >= 0 && genderNum <= 2) {
        queryBuilder.andWhere('user.gender = :gender', { gender: genderNum })
      }
    }

    // 按性别互推：男→女，女→男（筛选接口同样自动匹配性别）
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne({ where: { id: currentUserId }, select: ['gender'] })
      if (currentUser) {
        if (currentUser.gender === 1) {
          queryBuilder.andWhere('user.gender = :autoGender', { autoGender: 2 })
        } else if (currentUser.gender === 2) {
          queryBuilder.andWhere('user.gender = :autoGender', { autoGender: 1 })
        }
      }
    }

    if (dto.ageMin !== undefined && dto.ageMin !== null && Number.isFinite(dto.ageMin)) {
      const maxBirthYear = new Date().getFullYear() - dto.ageMin
      queryBuilder.andWhere('user.birthYear <= :maxBirthYear', { maxBirthYear })
    }

    if (dto.ageMax !== undefined && dto.ageMax !== null && Number.isFinite(dto.ageMax)) {
      const minBirthYear = new Date().getFullYear() - dto.ageMax
      queryBuilder.andWhere('user.birthYear >= :minBirthYear', { minBirthYear })
    }

    if (dto.heightMin !== undefined && dto.heightMin !== null && Number.isFinite(dto.heightMin)) {
      queryBuilder.andWhere('user.height >= :heightMin', { heightMin: dto.heightMin })
    }

    if (dto.heightMax !== undefined && dto.heightMax !== null && Number.isFinite(dto.heightMax)) {
      queryBuilder.andWhere('user.height <= :heightMax', { heightMax: dto.heightMax })
    }

    if (dto.education) {
      const educationLevels = ['高中', '大专', '本科', '硕士', '博士']
      const levelIndex = educationLevels.indexOf(dto.education)
      if (levelIndex !== -1) {
        const allowedEducations = educationLevels.slice(levelIndex)
        queryBuilder.andWhere('user.education IN (:...educations)', { educations: allowedEducations })
      }
    }

    if (dto.incomeRange) {
      queryBuilder.andWhere('user.incomeRange = :incomeRange', { incomeRange: dto.incomeRange })
    }

    if (dto.maritalStatus) {
      queryBuilder.andWhere('user.maritalStatus = :maritalStatus', { maritalStatus: dto.maritalStatus })
    }

    if (dto.isRealName !== undefined && dto.isRealName !== null) {
      const isRealNameNum = Number(dto.isRealName)
      if (Number.isFinite(isRealNameNum) && (isRealNameNum === 0 || isRealNameNum === 1)) {
        queryBuilder.andWhere('user.isRealName = :isRealName', { isRealName: isRealNameNum })
      }
    }

    if (dto.residence) {
      queryBuilder.andWhere('user.residence LIKE :residence', { residence: `%${dto.residence}%` })
    }

    if (dto.hometown) {
      queryBuilder.andWhere('user.hometown LIKE :hometown', { hometown: `%${dto.hometown}%` })
    }

    if (dto.keyword) {
      queryBuilder.andWhere('(user.nickname LIKE :keyword)', { keyword: `%${dto.keyword}%` })
    }

    queryBuilder.orderBy('user.lastLoginAt', 'DESC')

    const total = await queryBuilder.getCount()
    const totalPages = Math.ceil(total / pageSize)
    const offset = (pageNum - 1) * pageSize

    const users = await queryBuilder.skip(offset).take(pageSize).getMany()

    const followedUserIds: number[] = []
    if (currentUserId) {
      const follows = await this.followRepository.find({
        where: { userId: currentUserId },
        select: ['targetUserId'],
      })
      followedUserIds.push(...follows.map((f) => f.targetUserId))
    }

    const userIds = users.map((u) => u.id)
    const photosMap = await this.getPhotosMap(userIds)
    const commentsMap = await this.getCommentsMap(userIds)

    const list: UserListItem[] = users.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar || '',
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
      isFollowed: followedUserIds.includes(user.id),
      matchmakerComment: commentsMap.get(user.id) || '',
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
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
      introText: string
    }
  }> {
    const user = await this.userRepository.findOne({
      where: { id, status: 1, isDeleted: 0 },
      relations: ['photos'],
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    const photos = await this.userPhotoRepository.find({
      where: { userId: id },
      order: { sortOrder: 'ASC' },
    })

    let isFollowed = false
    let isSelf = false

    if (currentUserId) {
      isSelf = currentUserId === id
      if (!isSelf) {
        // 记录来访
        this.visitRepository.save(
          this.visitRepository.create({ userId: id, visitorUserId: currentUserId }),
        ).catch((err) => console.error('Record visit error:', err?.message || err))

        // 更新访问者的最后活跃时间
        this.userRepository.update(currentUserId, { lastActiveAt: new Date() })
          .catch((err) => console.error('Update lastActiveAt error:', err?.message || err))

        const follow = await this.followRepository.findOne({
          where: { userId: currentUserId, targetUserId: id },
        })
        isFollowed = !!follow
      }
    }

    const userPhotos = photos.map((p) => ({
      id: p.id,
      url: p.photoUrl,
      sortOrder: p.sortOrder,
    }))

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
        nickname: user.nickname,
        avatar: user.avatar,
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
        introText: await this.buildUserIntroText(user),
      },
    }
  }

  async followUser(userId: number, targetUserId: number): Promise<void> {
    if (userId === targetUserId) {
      throw new UnauthorizedException('不能关注自己')
    }

    // 使用事务：同时检查、创建关注记录
    await this.followRepository.manager.transaction(async (manager) => {
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
        throw new UnauthorizedException('已关注该用户')
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
      nickname: user.nickname,
      avatar: user.avatar || '',
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
      nickname: user.nickname,
      avatar: user.avatar || '',
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
        .getRawOne()
        .then(r => Number(r?.cnt) || 0),
      this.visitRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.userId)', 'cnt')
        .where('v.visitorUserId = :userId', { userId })
        .getRawOne()
        .then(r => Number(r?.cnt) || 0),
    ])
    return { following, followers, footprints: myViews, viewedMe }
  }

  private async getPhotosMap(userIds: number[]): Promise<Map<number, string[]>> {
    const photos = await this.userPhotoRepository.find({
      where: { userId: In(userIds), isMain: 1 },
      order: { sortOrder: 'ASC' },
    })

    const map = new Map<number, string[]>()
    for (const photo of photos) {
      const existing = map.get(photo.userId) || []
      existing.push(photo.photoUrl)
      map.set(photo.userId, existing)
    }

    const allPhotos = await this.userPhotoRepository.find({
      where: { userId: In(userIds) },
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
  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user) {
      throw new NotFoundException('用户不存在')
    }

    // 只更新传入的非 undefined 字段
    if (dto.nickname !== undefined) user.nickname = dto.nickname
    if (dto.avatar !== undefined) user.avatar = dto.avatar
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
    if (dto.voiceUrl !== undefined) user.voiceUrl = dto.voiceUrl
    if (dto.voiceAuditStatus !== undefined) user.voiceAuditStatus = dto.voiceAuditStatus
    if (dto.voiceDuration !== undefined) user.voiceDuration = dto.voiceDuration

    // 语音审核：当 voiceUrl 非空且 voiceAuditStatus 为 0（待审核）时，创建待审核记录
    // 先关闭该用户所有旧的 PENDING 语音审核记录，确保一个用户只有一条有效的 PENDING
    if (dto.voiceUrl && dto.voiceAuditStatus === 0) {
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
            voiceUrl: dto.voiceUrl,
            duration: dto.voiceDuration,
          }),
          aiResult: 'AI转录中...',
          aiScore: 0,
        }),
      )

      // AI 转录异步执行，不阻塞 updateProfile HTTP 响应
      this.aiVoiceService.transcribeVoice(dto.voiceUrl).then((transcript) => {
        const aiResult = transcript
          ? `AI转录：${transcript.length > 100 ? transcript.slice(0, 100) + '...' : transcript}`
          : 'AI转录失败'
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
    return user
  }

  async getVoiceIntro(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
      select: ['id', 'voiceUrl', 'voiceDuration', 'voiceAuditStatus'],
    })
    if (!user || !user.voiceUrl) return null
    return {
      voiceUrl: user.voiceUrl,
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
            nickname: v.visitorUser.nickname,
            avatar: v.visitorUser.avatar || '',
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

    // 子查询：我浏览过的每个用户的最新一次浏览时间（排除已注销用户）
    const subQuery = this.visitRepository
      .createQueryBuilder('v')
      .select('v.userId', 'targetUserId')
      .addSelect('MAX(v.createdAt)', 'lastViewedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .innerJoin('v.user', 'u')
      .where('v.visitorUserId = :userId', { userId })
      .andWhere('u.isDeleted = :isDel', { isDel: 0 })
      .andWhere('u.status = :status', { status: 1 })
      .groupBy('v.userId')

    const total = await this.visitRepository
      .createQueryBuilder('v')
      .select('COUNT(DISTINCT v.userId)', 'cnt')
      .innerJoin('v.user', 'u')
      .where('v.visitorUserId = :userId', { userId })
      .andWhere('u.isDeleted = :isDel2', { isDel2: 0 })
      .andWhere('u.status = :status2', { status2: 1 })
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
        .andWhere('u.status = :status', { status: 1 })
        .getMany()
      for (const u of users) usersMap.set(Number(u.id), u)
    }

    const list = rows.map(r => {
      const u = usersMap.get(Number(r.targetUserId))
      return {
        id: Number(r.targetUserId),
        nickname: u?.nickname || '',
        avatar: u?.avatar || '',
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
  async getMyVisitorsWithCount(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<any>> {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 20))

    const subQuery = this.visitRepository
      .createQueryBuilder('v')
      .select('v.visitorUserId', 'visitorUserId')
      .addSelect('MAX(v.createdAt)', 'lastVisitedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .innerJoin('v.visitorUser', 'u')
      .where('v.userId = :userId', { userId })
      .andWhere('u.isDeleted = :isDel', { isDel: 0 })
      .andWhere('u.status = :status', { status: 1 })
      .groupBy('v.visitorUserId')

    const total = await this.visitRepository
      .createQueryBuilder('v')
      .select('COUNT(DISTINCT v.visitorUserId)', 'cnt')
      .innerJoin('v.visitorUser', 'u')
      .where('v.userId = :userId', { userId })
      .andWhere('u.isDeleted = :isDel2', { isDel2: 0 })
      .andWhere('u.status = :status2', { status2: 1 })
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
        .andWhere('u.status = :status', { status: 1 })
        .getMany()
      for (const u of users) usersMap.set(Number(u.id), u)
    }

    const list = rows.map(r => {
      const u = usersMap.get(Number(r.visitorUserId))
      return {
        id: Number(r.visitorUserId),
        nickname: u?.nickname || '',
        avatar: u?.avatar || '',
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

  async deactivateAccount(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在')
    user.isDeleted = 1
    user.status = 0
    user.deleteReason = '用户自行注销'
    await this.userRepository.save(user)
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
  ): Promise<{ id: number; nickname: string; avatar: string; age: number; gender: number; location: string; createdAt: Date; isMutual?: boolean }[]> {
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
          nickname: user.nickname,
          avatar: user.avatar || '',
          age: this.calculateAge(user.birthYear),
          gender: user.gender,
          location: user.residence || user.hometown || '',
          createdAt: createdAtMap.get(uid) || new Date(),
        }
      })
      .filter(Boolean) as { id: number; nickname: string; avatar: string; age: number; gender: number; location: string; createdAt: Date }[]
  }

  /** 记录用户协议同意/不同意 */
  async recordAgreement(
    userId: number,
    agreementType: string,
    version: string,
    action: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const agreement = this.agreementRepo.create({
      userId,
      agreementType,
      version,
      action,
      ipAddress: ipAddress || null,
    })
    await this.agreementRepo.save(agreement)

    // 同步写入 AgreementLogStorage，确保管理后台"同意记录查询"可查到
    this.agreementLogStorage.saveLog({
      userId,
      agreementType,
      version,
      action,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
    }).catch(err => console.error('[user] saveLog failed:', err?.message || err))

    // 同步更新 User 表中的最近同意时间与版本
    if (action === 'agree') {
      await this.userRepository.update(userId, {
        protocolAgreedAt: new Date(),
        protocolVersion: version,
      })
    }
  }
}
