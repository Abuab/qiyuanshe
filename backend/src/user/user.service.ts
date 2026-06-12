import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder, In } from 'typeorm'
import { User, UserPhoto } from '../entities'
import { Follow } from '../entities/Follow'
import { ProfileVisit } from '../entities/ProfileVisit'
import { FilterUsersDto } from './dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

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
}

export interface RecommendFilters {
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
  ) {}

  async findRecommend(
    tab: string,
    page: number = 1,
    limit: number = 10,
    gender?: number,
    currentUserId?: number,
    filters?: RecommendFilters,
  ): Promise<PaginatedResult<UserListItem>> {
    try {
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as any) || 10))
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 1 })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })
      .andWhere('user.id != :adminId', { adminId: 1 })

    // 严格校验 gender 参数，避免 NaN 传入 SQL（0=未知, 1=男, 2=女）
    if (gender !== undefined && gender !== null) {
      const genderNum = Number(gender)
      if (Number.isFinite(genderNum) && genderNum >= 0 && genderNum <= 2) {
        queryBuilder.andWhere('user.gender = :gender', { gender: genderNum })
      }
    }

    // 按性别互推：男→女，女→男
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne({ where: { id: currentUserId }, select: ['gender'] })
      if (currentUser) {
        if (currentUser.gender === 1) {
          queryBuilder.andWhere('user.gender = :forceGender', { forceGender: 2 })
        } else if (currentUser.gender === 2) {
          queryBuilder.andWhere('user.gender = :forceGender', { forceGender: 1 })
        }
      }
    }

    // 应用筛选条件
    if (filters) {
      if (filters.ageMin !== undefined && filters.ageMin !== null && Number.isFinite(filters.ageMin)) {
        const maxBirthYear = new Date().getFullYear() - filters.ageMin
        queryBuilder.andWhere('user.birthYear <= :maxBirthYear', { maxBirthYear })
      }
      if (filters.ageMax !== undefined && filters.ageMax !== null && Number.isFinite(filters.ageMax)) {
        const minBirthYear = new Date().getFullYear() - filters.ageMax
        queryBuilder.andWhere('user.birthYear >= :minBirthYear', { minBirthYear })
      }
      if (filters.heightMin !== undefined && filters.heightMin !== null && Number.isFinite(filters.heightMin)) {
        queryBuilder.andWhere('user.height >= :heightMin', { heightMin: filters.heightMin })
      }
      if (filters.heightMax !== undefined && filters.heightMax !== null && Number.isFinite(filters.heightMax)) {
        queryBuilder.andWhere('user.height <= :heightMax', { heightMax: filters.heightMax })
      }
      if (filters.education) {
        const educationLevels = ['高中', '大专', '本科', '硕士', '博士']
        const levelIndex = educationLevels.indexOf(filters.education)
        if (levelIndex !== -1) {
          const allowedEducations = educationLevels.slice(levelIndex)
          queryBuilder.andWhere('user.education IN (:...educations)', { educations: allowedEducations })
        }
      }
      if (filters.incomeRange) {
        queryBuilder.andWhere('user.incomeRange = :incomeRange', { incomeRange: filters.incomeRange })
      }
      if (filters.maritalStatus) {
        queryBuilder.andWhere('user.maritalStatus = :maritalStatus', { maritalStatus: filters.maritalStatus })
      }
      if (filters.isRealName !== undefined && filters.isRealName !== null) {
        const isRealNameNum = Number(filters.isRealName)
        if (Number.isFinite(isRealNameNum) && (isRealNameNum === 0 || isRealNameNum === 1)) {
          queryBuilder.andWhere('user.isRealName = :isRealName', { isRealName: isRealNameNum })
        }
      }
      if (filters.residence) {
        queryBuilder.andWhere('user.residence LIKE :residence', { residence: `%${filters.residence}%` })
      }
      if (filters.hometown) {
        queryBuilder.andWhere('user.hometown LIKE :hometown', { hometown: `%${filters.hometown}%` })
      }
      if (filters.keyword) {
        queryBuilder.andWhere('(user.nickname LIKE :keyword)', { keyword: `%${filters.keyword}%` })
      }
    }

    switch (tab) {
      case 'active':
        queryBuilder.orderBy('user.lastLoginAt', 'DESC')
        break
      case 'featured':
        queryBuilder
          .orderBy('user.isVip', 'DESC')
          .addOrderBy('user.lastLoginAt', 'DESC')
        break
      case 'verified':
      case 'realname':
        queryBuilder.andWhere('user.isRealName = :isRealName', { isRealName: 1 })
        queryBuilder.orderBy('user.lastLoginAt', 'DESC')
        break
      case 'newest':
        queryBuilder.orderBy('user.createdAt', 'DESC')
        break
      default:
        queryBuilder.orderBy('user.lastLoginAt', 'DESC')
    }

    const total = await queryBuilder.getCount()
    const totalPages = Math.ceil(total / pageSize)
    const offset = (pageNum - 1) * pageSize

    const users = await queryBuilder
      .skip(offset)
      .take(pageSize)
      .getMany()

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
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
    } catch (error) {
      console.error('findRecommend error:', error)
      throw error
    }
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
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
  }

  async getUserDetail(
    id: number,
    currentUserId?: number,
  ): Promise<{
    user: Partial<User> & { photos: any[]; isFollowed: boolean; isSelf: boolean }
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
        selfIntro: user.selfIntro,
        mateRequirement: user.mateRequirement,
        isRealName: user.isRealName,
        isVip: user.isVip,
        vipLevel: user.vipLevel,
        vipExpireTime: user.vipExpireTime,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        photos: userPhotos as any,
        isFollowed,
        isSelf,
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
    }))

    return {
      list,
      total,
      page: pageNum,
      pageSize,
      totalPages,
    }
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
      if (existing && existing.length < 4) {
        existing.push(photo.photoUrl)
      }
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
    if (dto.gender !== undefined) user.gender = dto.gender
    if (dto.birthYear !== undefined) user.birthYear = dto.birthYear
    if (dto.height !== undefined) user.height = dto.height
    if (dto.weight !== undefined) user.weight = dto.weight
    if (dto.education !== undefined) user.education = dto.education
    if (dto.occupation !== undefined) user.occupation = dto.occupation
    if (dto.incomeRange !== undefined) user.incomeRange = dto.incomeRange
    if (dto.maritalStatus !== undefined) user.maritalStatus = dto.maritalStatus
    if (dto.hometown !== undefined) user.hometown = dto.hometown
    if (dto.residence !== undefined) user.residence = dto.residence
    if (dto.selfIntro !== undefined) user.selfIntro = dto.selfIntro
    if (dto.housingStatus !== undefined) user.housingStatus = dto.housingStatus
    if (dto.carStatus !== undefined) user.carStatus = dto.carStatus
    if (dto.partnerHometown !== undefined) user.partnerHometown = dto.partnerHometown
    if (dto.partnerResidence !== undefined) user.partnerResidence = dto.partnerResidence

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

    await this.userRepository.save(user)
    return user
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

  async deactivateAccount(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('用户不存在')
    user.isDeleted = 1
    user.status = 0
    user.deleteReason = '用户自行注销'
    await this.userRepository.save(user)
  }
}
