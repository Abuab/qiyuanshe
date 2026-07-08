import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import * as crypto from 'crypto'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserNotification } from '../entities/UserNotification'
import { AuditLog } from '../entities/AuditLog'
import { MatchRecord } from '../entities/MatchRecord'
import { Follow } from '../entities/Follow'
import { ProfileVisit } from '../entities/ProfileVisit'
import { normalizeImageUrl } from '../common/image-url'
import { getDisplayName } from '../common/user-utils'
import { DynamicService } from '../dynamic/dynamic.service'
import { calcProfileScore } from '../common/profile-score'
import * as bcrypt from 'bcrypt'

interface UserFilter {
  page?: number
  limit?: number
  keyword?: string
  gender?: number
  status?: number
  eidCertStatus?: number
  isVip?: number
  vipLevel?: number
  startDate?: string
  endDate?: string
  sort?: string
  order?: string
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  education?: string
  occupation?: string
  tags?: string[]
  zodiac?: string
  constellation?: string
  onlyChild?: string
  whenMarry?: string
  minMatchCount?: number
  maxMatchCount?: number
}

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(ProfileVisit)
    private readonly visitRepository: Repository<ProfileVisit>,
    private readonly dynamicService: DynamicService,
  ) {}

  async list(filter: UserFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.userRepository.createQueryBuilder('user')

    queryBuilder.where('user.id != :adminId', { adminId: 1 })

    queryBuilder.andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })

    if (filter.keyword) {
      const isNumericId = /^\d{6,7}$/.test(filter.keyword.trim())
      const userIdCondition = isNumericId ? ' OR user.userId = :userIdKw' : ''
      const params: Record<string, any> = {
        keyword: `%${filter.keyword}%`,
        id: parseInt(filter.keyword) || 0,
        phone: `%${filter.keyword}%`,
      }
      if (isNumericId) {
        params.userIdKw = filter.keyword.trim()
      }
      queryBuilder.andWhere(
        `(user.nickname LIKE :keyword OR user.id = :id OR user.phone LIKE :phone${userIdCondition})`,
        params,
      )
    }

    if (filter.gender) {
      queryBuilder.andWhere('user.gender = :gender', { gender: filter.gender })
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status: filter.status })
    }

    if (filter.eidCertStatus !== undefined) {
      queryBuilder.andWhere('user.eidCertStatus = :eidCertStatus', { eidCertStatus: filter.eidCertStatus })
    }

    if (filter.isVip !== undefined) {
      queryBuilder.andWhere('user.isVip = :isVip', { isVip: filter.isVip })
    }

    if (filter.vipLevel !== undefined) {
      queryBuilder.andWhere('user.vipLevel = :vipLevel', { vipLevel: filter.vipLevel })
    }

    if (filter.minAge !== undefined || filter.maxAge !== undefined) {
      const currentYear = new Date().getFullYear()
      if (filter.minAge !== undefined) {
        const maxBirthYear = currentYear - filter.minAge
        queryBuilder.andWhere('user.birthYear <= :maxBirthYear', { maxBirthYear })
      }
      if (filter.maxAge !== undefined) {
        const minBirthYear = currentYear - filter.maxAge
        queryBuilder.andWhere('user.birthYear >= :minBirthYear', { minBirthYear })
      }
    }

    if (filter.minHeight !== undefined) {
      queryBuilder.andWhere('user.height >= :minHeight', { minHeight: filter.minHeight })
    }
    if (filter.maxHeight !== undefined) {
      queryBuilder.andWhere('user.height <= :maxHeight', { maxHeight: filter.maxHeight })
    }

    if (filter.minWeight !== undefined) {
      queryBuilder.andWhere('user.weight >= :minWeight', { minWeight: filter.minWeight })
    }
    if (filter.maxWeight !== undefined) {
      queryBuilder.andWhere('user.weight <= :maxWeight', { maxWeight: filter.maxWeight })
    }

    if (filter.maritalStatus) {
      queryBuilder.andWhere('user.maritalStatus = :maritalStatus', { maritalStatus: filter.maritalStatus })
    }

    if (filter.incomeRange) {
      queryBuilder.andWhere('user.incomeRange = :incomeRange', { incomeRange: filter.incomeRange })
    }

    if (filter.housingStatus) {
      queryBuilder.andWhere('user.housingStatus = :housingStatus', { housingStatus: filter.housingStatus })
    }

    if (filter.carStatus) {
      queryBuilder.andWhere('user.carStatus = :carStatus', { carStatus: filter.carStatus })
    }

    if (filter.education) {
      queryBuilder.andWhere('user.education = :education', { education: filter.education })
    }

    if (filter.occupation) {
      queryBuilder.andWhere('user.occupation = :occupation', { occupation: filter.occupation })
    }

    if (filter.zodiac) {
      queryBuilder.andWhere('user.zodiac = :zodiac', { zodiac: filter.zodiac })
    }

    if (filter.constellation) {
      queryBuilder.andWhere('user.constellation = :constellation', { constellation: filter.constellation })
    }

    if (filter.onlyChild) {
      queryBuilder.andWhere('user.onlyChild = :onlyChild', { onlyChild: filter.onlyChild })
    }

    if (filter.whenMarry) {
      queryBuilder.andWhere('user.whenMarry = :whenMarry', { whenMarry: filter.whenMarry })
    }

    if (filter.tags && filter.tags.length > 0) {
      filter.tags.forEach((tag, index) => {
        queryBuilder.andWhere(`JSON_CONTAINS(user.tags, :tag${index})`, { [`tag${index}`]: JSON.stringify(tag) })
      })
    }

    if (filter.startDate) {
      queryBuilder.andWhere('user.createdAt >= :startDate', {
        startDate: filter.startDate,
      })
    }

    if (filter.endDate) {
      queryBuilder.andWhere('user.createdAt <= :endDate', { endDate: filter.endDate })
    }

    if (filter.sort) {
      const order = filter.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      queryBuilder.orderBy(`user.${filter.sort}`, order)
    } else {
      queryBuilder.orderBy('user.createdAt', 'DESC')
    }

    // Filter by match count (subquery)
    if (filter.minMatchCount !== undefined || filter.maxMatchCount !== undefined) {
      const matchSubQb = this.matchRecordRepository
        .createQueryBuilder('mr2')
        .select('mr2.userId')
        .addSelect('COUNT(mr2.id)', 'mcnt')
        .groupBy('mr2.userId')

      if (filter.minMatchCount !== undefined) {
        matchSubQb.having('COUNT(mr2.id) >= :minMatchCount', { minMatchCount: filter.minMatchCount })
      }
      if (filter.maxMatchCount !== undefined) {
        matchSubQb.having('COUNT(mr2.id) <= :maxMatchCount', { maxMatchCount: filter.maxMatchCount })
      }

      queryBuilder
        .innerJoin('(' + matchSubQb.getQuery() + ')', 'mfilter', 'user.id = mfilter.userId')
        .setParameters(matchSubQb.getParameters())
    }

    queryBuilder.skip(skip).take(limit)

    const [users, total] = await queryBuilder.getManyAndCount()

    // Bulk query audit statuses
    const userIds = users.map(u => u.id)

    const profileAuditMap = new Map<number, string>()
    const photoAuditMap = new Map<number, string>()

    if (userIds.length > 0) {
      const profileAudits = await this.auditLogRepository
        .createQueryBuilder('a')
        .select('a.targetId', 'targetId')
        .addSelect('a.action', 'action')
        .where('a.targetType = :userType', { userType: 'user' })
        .andWhere('a.action IN (:...auditActions)', { auditActions: ['PENDING', 'APPROVE', 'REJECT'] })
        .andWhere('a.targetId IN (:...userIds)', { userIds })
        .orderBy('a.createdAt', 'DESC')
        .getRawMany<{ targetId: number; action: string }>()

      const photoAudits = await this.auditLogRepository
        .createQueryBuilder('a')
        .select('a.targetId', 'targetId')
        .addSelect('a.action', 'action')
        .where('a.targetType = :photoType', { photoType: 'photo' })
        .andWhere('a.targetId IN (:...userIds)', { userIds })
        .orderBy('a.createdAt', 'DESC')
        .getRawMany<{ targetId: number; action: string }>()

      // Keep first (latest) record per targetId
      for (const row of profileAudits) {
        if (!profileAuditMap.has(row.targetId)) {
          profileAuditMap.set(row.targetId, row.action)
        }
      }
      for (const row of photoAudits) {
        if (!photoAuditMap.has(row.targetId)) {
          photoAuditMap.set(row.targetId, row.action)
        }
      }
    }

    // Bulk query match counts
    const matchCountMap = new Map<number, number>()
    if (userIds.length > 0) {
      const matchCounts = await this.matchRecordRepository
        .createQueryBuilder('mr')
        .select('mr.userId', 'userId')
        .addSelect('COUNT(mr.id)', 'cnt')
        .where('mr.userId IN (:...userIds)', { userIds })
        .groupBy('mr.userId')
        .getRawMany<{ userId: number; cnt: number }>();
      for (const row of matchCounts) {
        matchCountMap.set(Number(row.userId), Number(row.cnt))
      }
    }

    // Bulk query follow counts
    const followingCountMap = new Map<number, number>()
    const followerCountMap = new Map<number, number>()
    if (userIds.length > 0) {
      const followingCounts = await this.followRepository
        .createQueryBuilder('f')
        .select('f.userId', 'userId')
        .addSelect('COUNT(f.id)', 'cnt')
        .where('f.userId IN (:...userIds)', { userIds })
        .groupBy('f.userId')
        .getRawMany<{ userId: number; cnt: number }>()
      for (const row of followingCounts) {
        followingCountMap.set(Number(row.userId), Number(row.cnt))
      }

      const followerCounts = await this.followRepository
        .createQueryBuilder('f')
        .select('f.targetUserId', 'userId')
        .addSelect('COUNT(f.id)', 'cnt')
        .where('f.targetUserId IN (:...userIds)', { userIds })
        .groupBy('f.targetUserId')
        .getRawMany<{ userId: number; cnt: number }>()
      for (const row of followerCounts) {
        followerCountMap.set(Number(row.userId), Number(row.cnt))
      }
    }

    // Bulk query view counts (how many unique users this user has viewed)
    const viewCountMap = new Map<number, number>()
    if (userIds.length > 0) {
      const viewCounts = await this.visitRepository
        .createQueryBuilder('v')
        .select('v.visitorUserId', 'userId')
        .addSelect('COUNT(DISTINCT v.userId)', 'cnt')
        .where('v.visitorUserId IN (:...userIds)', { userIds })
        .groupBy('v.visitorUserId')
        .getRawMany<{ userId: number; cnt: number }>()
      for (const row of viewCounts) {
        viewCountMap.set(Number(row.userId), Number(row.cnt))
      }
    }

    // Merge audit status from bulk queries
    const result = users.map(user => {
      // 将 simple-json 字段强制转纯 JS 数组，确保 JSON 序列化正确
      const tags = ensureArray(user.tags)
      const personalityTags = ensureArray(user.personalityTags)
      const hopeTaTags = ensureArray(user.hopeTaTags)

      // 直接用显式字段构建纯对象，绕过 TypeORM entity 的序列化陷阱
      return {
        id: user.id,
        userId: user.userId || '',
        nickname: user.nickname,
        displayName: getDisplayName(user.nickname, user.userId),
        avatar: user.avatar,
        phone: user.phone,
        openid: user.openid,
        gender: user.gender,
        birthYear: user.birthYear,
        height: user.height,
        weight: user.weight,
        education: user.education,
        occupation: user.occupation,
        incomeRange: user.incomeRange,
        housingStatus: user.housingStatus,
        carStatus: user.carStatus,
        maritalStatus: user.maritalStatus,
        onlyChild: user.onlyChild,
        whenMarry: user.whenMarry,
        zodiac: user.zodiac,
        constellation: user.constellation,
        hometown: user.hometown,
        residence: user.residence,
        partnerAgeRange: user.partnerAgeRange,
        partnerHeightMin: user.partnerHeightMin,
        partnerEducation: user.partnerEducation,
        partnerIncome: user.partnerIncome,
        housingRequirement: user.housingRequirement,
        partnerMaritalStatus: user.partnerMaritalStatus,
        acceptChildren: user.acceptChildren,
        mateRequirement: user.mateRequirement,
        isRealName: user.isRealName,
        eidCertStatus: user.eidCertStatus || 0,
        isVip: user.isVip,
        vipLevel: user.vipLevel,
        vipExpireTime: user.vipExpireTime,
        vipPackageName: user.vipPackageName,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        showBasicProfile: user.showBasicProfile ?? true,
        delegateToPlatform: user.delegateToPlatform ?? false,
        tags,
        personalityTags,
        hopeTaTags,
        adminRemark: user.adminRemark,
        age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
        profileAuditStatus: profileAuditMap.get(user.id) || 'unsubmitted',
        photoAuditStatus: photoAuditMap.get(user.id) || 'unsubmitted',
        matchCount: matchCountMap.get(user.id) || 0,
        followingCount: followingCountMap.get(user.id) || 0,
        followerCount: followerCountMap.get(user.id) || 0,
        viewCount: viewCountMap.get(user.id) || 0,
        /** 运营/推荐字段 */
        profileScore: calcProfileScore(user),
        manualBoostScore: user.manualBoostScore || 0,
        exposurePool: user.exposurePool || 'city',
        pinnedExpireAt: user.pinnedExpireAt || null,
        lastActiveAt: user.lastActiveAt || null,
        protocolAgreedAt: user.protocolAgreedAt || null,
        protocolVersion: user.protocolVersion || null,
      }
    })

    return {
      list: result,
      page,
      limit,
      total,
    }
  }

  async export(filter: UserFilter & { ids?: number[] }) {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
    queryBuilder.where('user.id != :adminId', { adminId: 1 })
    queryBuilder.andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })

    if (filter.ids && filter.ids.length > 0) {
      queryBuilder.andWhere('user.id IN (:...ids)', { ids: filter.ids })
    }

    if (filter.keyword) {
      queryBuilder.andWhere(
        '(user.nickname LIKE :keyword OR user.id = :id OR user.phone LIKE :phone)',
        { keyword: `%${filter.keyword}%`, id: parseInt(filter.keyword) || 0, phone: `%${filter.keyword}%` },
      )
    }
    if (filter.education) {
      queryBuilder.andWhere('user.education = :education', { education: filter.education })
    }

    const users = await queryBuilder.orderBy('user.createdAt', 'DESC').getMany()

    return users.map(u => ({
      ID: u.id,
      昵称: u.nickname,
      手机号: u.phone,
      性别: u.gender === 1 ? '男' : u.gender === 2 ? '女' : '未知',
      年龄: u.birthYear ? new Date().getFullYear() - u.birthYear : '-',
      学历: u.education || '-',
      婚况: u.maritalStatus || '-',
      月收入: u.incomeRange || '-',
      住房: u.housingStatus || '-',
      车辆: u.carStatus || '-',
      职业: u.occupation || '-',
      会员等级: u.vipLevel === 1 ? '黄金' : u.vipLevel === 2 ? '钻石' : u.vipLevel === 3 ? '至尊' : '普通',
      状态: u.status === 1 ? '正常' : u.status === 0 ? '禁用' : '待审核',
      注册时间: u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '-',
    }))
  }

  async detail(id: number) {
    const user = await this.userRepository.findOne({ where: { id, isDeleted: 0 } })
    if (!user) return null
    const photos = await this.userPhotoRepository.find({
      where: { userId: id },
      order: { sortOrder: 'ASC' },
    })

    // 同步头像、查询审核状态（资料 + 照片最新一条记录）
    // 注意：排除 UPDATE_TAGS/BATCH_UPDATE_TAGS 等非审核操作，避免误将运营操作当作审核状态
    const [profileAudit, photoAudit] = await Promise.all([
      this.auditLogRepository.findOne({
        where: { targetType: 'user', targetId: id, action: In(['PENDING', 'APPROVE', 'REJECT']) },
        order: { createdAt: 'DESC' },
      }),
      this.auditLogRepository.findOne({ where: { targetType: 'photo', targetId: id }, order: { createdAt: 'DESC' } }),
    ])
    const profileAuditStatus = profileAudit?.action || 'unsubmitted'
    const photoAuditStatus = photoAudit?.action || 'unsubmitted'

    // 自动从第一张照片同步头像（历史数据兜底 + 实时同步）
    if ((!user.avatar || !user.avatar.trim()) && photos.length > 0) {
      const mainPhoto = photos.find(p => p.isMain === 1) || photos[0]
      if (mainPhoto?.photoUrl) {
        user.avatar = mainPhoto.photoUrl
        user.updatedAt = new Date()
        await this.userRepository.save(user)
      }
    }

    const { password, ...safeUser } = user
    return {
      ...safeUser,
      userId: user.userId || '',
      displayName: getDisplayName(user.nickname, user.userId),
      avatar: normalizeImageUrl(safeUser.avatar),
      // simple-json 列兜底解析，避免 findOne 未正确反序列化
      tags: parseSimpleJson(safeUser.tags),
      personalityTags: parseSimpleJson(safeUser.personalityTags),
      hopeTaTags: parseSimpleJson(safeUser.hopeTaTags),
      photos: photos.map(p => ({ ...p, photoUrl: normalizeImageUrl(p.photoUrl) })),
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
      // 审核状态：与 list 一致，返回字符串 'PENDING'/'APPROVE'/'REJECT'/'unsubmitted'
      profileAuditStatus,
      photoAuditStatus,
      protocolAgreedAt: user.protocolAgreedAt || null,
      protocolVersion: user.protocolVersion || null,
    }
  }

  async getUserBasicInfo(id: number) {
    const user = await this.userRepository.findOne({ where: { id }, select: ['id', 'nickname'] })
    return user
  }

  async updateStatus(id: number, status: number) {
    await this.userRepository.update(id, { status })
  }

  async updateVip(id: number, level: number, days: number, packageName?: string) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) return

    const now = new Date()
    const expireTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const updateData: Record<string, any> = {
      isVip: level > 0 ? 1 : 0,
      vipLevel: level,
      vipExpireTime: level > 0 ? expireTime : null,
    }
    if (packageName !== undefined) {
      updateData.vipPackageName = packageName
    }
    await this.userRepository.update(id, updateData)
  }

  /**
   * 使用 crypto.randomInt 随机生成强密码（大小写字母 + 数字），确保均匀分布。
   * @param length 密码长度，默认 12 位
   */
  private generateRandomPassword(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const result: string[] = []
    for (let i = 0; i < length; i++) {
      result.push(chars[crypto.randomInt(chars.length)])
    }
    return result.join('')
  }

  async resetPassword(id: number) {
    const password = this.generateRandomPassword()
    const hashedPassword = await bcrypt.hash(password, 10)
    await this.userRepository.update(id, { password: hashedPassword })
  }

  async sendNotification(userId: number, title: string, content: string) {
    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId,
        title: title || '系统通知',
        content,
        senderType: 'admin',
      }),
    )
  }

  async getPhotos(userId: number) {
    const photos = await this.userPhotoRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    return photos.map(p => ({ ...p, photoUrl: normalizeImageUrl(p.photoUrl) }))
  }

  async addPhoto(userId: number, photoUrl: string) {
    const normalizedUrl = photoUrl.includes('://') ? '/' + photoUrl.split('/').slice(3).join('/') : photoUrl
    const photo = this.userPhotoRepository.create({
      userId,
      photoUrl: normalizedUrl,
      isMain: 0,
      sortOrder: 0,
      auditStatus: 1,
    })
    const saved = await this.userPhotoRepository.save(photo)

    // 自动生成照片动态
    this.dynamicService.autoCreateDynamic({
      userId,
      type: 'photo',
      images: [normalizedUrl],
    }).catch((err) => console.error('添加照片动态失败:', err?.message || err))

    return saved
  }

  async deletePhoto(photoId: number) {
    await this.userPhotoRepository.delete(photoId)
  }

  async setMainPhoto(photoId: number) {
    const photo = await this.userPhotoRepository.findOne({ where: { id: photoId } })
    if (!photo) throw new Error('照片不存在')
    // 将该用户的所有照片设为非主图
    await this.userPhotoRepository.update({ userId: photo.userId }, { isMain: 0 })
    // 设置目标照片为主图
    await this.userPhotoRepository.update(photoId, { isMain: 1 })
    // 同步更新用户头像
    if (photo.photoUrl) {
      await this.userRepository.update(photo.userId, { avatar: photo.photoUrl })
    }
  }

  async batchUpdateStatus(ids: number[], status: number) {
    await this.userRepository.update(ids, { status })
  }

  async softDelete(id: number) {
    await this.userRepository.update(id, { isDeleted: 1 })
  }

  async batchSoftDelete(ids: number[]) {
    await this.userRepository.update(ids, { isDeleted: 1 })
  }

  /** 查询已注销用户列表 */
  async listDeactivated(filter: { page?: number; limit?: number; keyword?: string }) {
    const page = Math.max(1, parseInt(String(filter.page || 1), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(filter.limit || 20), 10) || 20))
    const skip = (page - 1) * limit

    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: 1 })
      .orderBy('user.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)

    if (filter.keyword) {
      queryBuilder.andWhere(
        '(user.nickname LIKE :keyword OR user.phone LIKE :keyword)',
        { keyword: `%${filter.keyword}%` },
      )
    }

    const [list, total] = await queryBuilder.getManyAndCount()

    return {
      list: list.map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        phone: u.phone,
        gender: u.gender,
        deleteReason: u.deleteReason,
        createdAt: u.createdAt,
        canceledAt: u.updatedAt,
      })),
      page,
      limit,
      total,
    }
  }

  /** 恢复已注销用户 */
  async restoreUser(id: number) {
    const user = await this.userRepository.findOne({ where: { id, isDeleted: 1 } })
    if (!user) throw new NotFoundException('用户不存在或未注销')
    user.isDeleted = 0
    user.status = 1
    user.deleteReason = null
    await this.userRepository.save(user)
  }

  /** 彻底删除用户（物理删除） */
  async permanentDelete(id: number) {
    const user = await this.userRepository.findOne({ where: { id, isDeleted: 1 } })
    if (!user) throw new NotFoundException('用户不存在或未注销')
    await this.userRepository.remove(user)
  }

  /**
   * 生成 6 位唯一数字 userId（范围 100000~999999）
   * 复用 UserService 的生成逻辑，通过 userRepository 直接查重
   */
  private async generateUserId(): Promise<string> {
    const MAX_RETRIES = 10
    for (let i = 0; i < MAX_RETRIES; i++) {
      const num = Math.floor(Math.random() * 900000) + 100000
      const userId = String(num)
      const exists = await this.userRepository.findOne({ where: { userId }, select: ['id'] })
      if (!exists) return userId
    }
    // 6位池接近耗尽，扩展到7位
    for (let i = 0; i < MAX_RETRIES; i++) {
      const num = Math.floor(Math.random() * 9000000) + 1000000
      const userId = String(num)
      const exists = await this.userRepository.findOne({ where: { userId }, select: ['id'] })
      if (!exists) return userId
    }
    throw new Error('无法生成唯一 userId，ID池已耗尽')
  }

  async createUser(data: {
    nickname: string
    phone: string
    password?: string
    gender?: number
    avatar?: string
    birthYear?: number
    education?: string
    incomeRange?: string
    housingStatus?: string
    carStatus?: string
    maritalStatus?: string
    height?: number
    weight?: number
    occupation?: string
    hometown?: string
    residence?: string
    status?: number
    adminId?: number
    personalityTags?: string | string[]
    hopeTaTags?: string | string[]
    onlyChild?: string
    whenMarry?: string
    zodiac?: string
    constellation?: string
    partnerAgeRange?: string
    partnerHeightMin?: string
    partnerEducation?: string
    partnerIncome?: string
    housingRequirement?: string
    partnerMaritalStatus?: string
    acceptChildren?: string
    photoUrls?: string[]
  }) {
    // 管理员创建用户未提供密码时，生成随机强密码
    const defaultPassword = this.generateRandomPassword()
    const hashedPassword = await bcrypt.hash(data.password || defaultPassword, 10)
    
    // 管理员手动创建的用户默认为待审核状态(status=2)
    const status = data.status !== undefined ? data.status : 2
    
    // 处理 personalityTags: 兼容结构化对象 / 逗号分隔字符串 / 数组
    let personalityTags: any = null
    if (typeof data.personalityTags === 'object' && data.personalityTags !== null) {
      personalityTags = data.personalityTags
    } else if (typeof data.personalityTags === 'string') {
      personalityTags = data.personalityTags.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    const hopeTaTags = Array.isArray(data.hopeTaTags)
      ? data.hopeTaTags
      : data.hopeTaTags
        ? String(data.hopeTaTags).split(',').map((s: string) => s.trim()).filter(Boolean)
        : null

    const generatedUserId = await this.generateUserId()

    const user = this.userRepository.create({
      userId: generatedUserId,
      nickname: data.nickname,
      phone: data.phone,
      password: hashedPassword,
      gender: data.gender || 0,
      avatar: data.avatar || '',
      birthYear: data.birthYear || null,
      education: data.education || null,
      incomeRange: data.incomeRange || null,
      housingStatus: data.housingStatus || null,
      carStatus: data.carStatus || null,
      maritalStatus: data.maritalStatus || null,
      height: data.height || null,
      weight: data.weight || null,
      occupation: data.occupation || null,
      hometown: data.hometown || null,
      residence: data.residence || null,
      personalityTags,
      hopeTaTags,
      onlyChild: data.onlyChild || null,
      whenMarry: data.whenMarry || null,
      zodiac: data.zodiac || null,
      constellation: data.constellation || null,
      partnerAgeRange: data.partnerAgeRange || null,
      partnerHeightMin: data.partnerHeightMin || null,
      partnerEducation: data.partnerEducation || null,
      partnerIncome: data.partnerIncome || null,
      housingRequirement: data.housingRequirement || null,
      partnerMaritalStatus: data.partnerMaritalStatus || null,
      acceptChildren: data.acceptChildren || null,
      status,
      isVip: 0,
      vipLevel: 0,
      openid: null,
      unionId: null,
      tags: ['后台添加'],
    })

    const saved = await this.userRepository.save(user)

    // 创建用户照片记录
    if (data.photoUrls && data.photoUrls.length > 0) {
      const photos = data.photoUrls.map((url, index) => ({
        userId: saved.id,
        photoUrl: url,
        isMain: index === 0 ? 1 : 0,
        sortOrder: index,
        auditStatus: 1,
      }))
      await this.userPhotoRepository.insert(photos)

      // 自动生成照片动态，新用户也能在动态页展示
      this.dynamicService.autoCreateDynamic({
        userId: saved.id,
        type: 'photo',
        images: data.photoUrls,
      }).catch((err) => console.error('创建用户照片动态失败:', err?.message || err))
    }

    // 创建审核记录
    const auditLog = this.auditLogRepository.create({
      targetType: 'user_create',
      targetId: saved.id,
      action: 'PENDING',
      adminId: data.adminId || null,
      submitterId: data.adminId || null,
      content: JSON.stringify({
        nickname: saved.nickname,
        phone: saved.phone,
        gender: saved.gender,
        birthYear: saved.birthYear,
        education: saved.education,
        incomeRange: saved.incomeRange,
        housingStatus: saved.housingStatus,
        carStatus: saved.carStatus,
        maritalStatus: saved.maritalStatus,
        height: saved.height,
        occupation: saved.occupation,
        hometown: saved.hometown,
        residence: saved.residence,
      }),
    })
    await this.auditLogRepository.save(auditLog)

    return saved
  }

  async updateUser(id: number, data: Partial<User>) {
    const allowedFields = [
      'nickname', 'avatar', 'gender', 'birthYear', 'birthMonth', 'birthDay', 'height', 'weight',
      'education', 'occupation', 'incomeRange', 'housingStatus', 'carStatus',
      'maritalStatus', 'hometown', 'residence', 'mateRequirement',
      'isRealName', 'status', 'phone', 'tags', 'personalityTags', 'hopeTaTags', 'adminRemark',
      'onlyChild', 'whenMarry', 'zodiac', 'constellation',
      'partnerAgeRange', 'partnerHeightMin', 'partnerEducation', 'partnerIncome',
      'housingRequirement', 'partnerMaritalStatus', 'acceptChildren',
      'isVip', 'vipLevel', 'vipExpireTime',
    ]

    const safeData: any = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        // 跳过空数组（simple-json 字段），避免误清数据
        if (Array.isArray(data[key]) && data[key].length === 0) {
          continue
        }
        safeData[key] = data[key]
      }
    }

    // personalityTags / hopeTaTags: 兼容逗号分割字符串与数组两种格式
    if (safeData.personalityTags && typeof safeData.personalityTags === 'string') {
      safeData.personalityTags = safeData.personalityTags.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (safeData.hopeTaTags && typeof safeData.hopeTaTags === 'string') {
      safeData.hopeTaTags = safeData.hopeTaTags.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    // tags 同理
    if (safeData.tags && typeof safeData.tags === 'string') {
      safeData.tags = safeData.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    if (data['password']) {
      safeData['password'] = await bcrypt.hash(data['password'], 10)
    }

    await this.userRepository.update(id, safeData)
  }

  /** 重新生成用户照片动态（用于修复历史数据） */
  async regenerateUserDynamics(userId: number) {
    const photos = await this.userPhotoRepository.find({
      where: { userId },
      order: { sortOrder: 'ASC' },
      take: 4,
    })
    if (photos.length === 0) {
      return { success: false, message: '该用户没有照片' }
    }
    const photoUrls = photos.map((p) => {
      const url = p.photoUrl
      if (!url) return ''
      if (url.startsWith('http')) return url
      return url.startsWith('/') ? url : '/' + url
    }).filter(Boolean)
    if (photoUrls.length === 0) {
      return { success: false, message: '照片 URL 为空' }
    }
    await this.dynamicService.autoCreateDynamic({
      userId,
      type: 'photo',
      images: photoUrls,
    })
    return { success: true, message: `已生成动态，${photoUrls.length} 张照片` }
  }

  // ===== 关注管理 =====

  async getUserFollowStats(userId: number) {
    const [following, followers] = await Promise.all([
      this.followRepository.count({ where: { userId } }),
      this.followRepository.count({ where: { targetUserId: userId } }),
    ])
    return { following, followers }
  }

  async getUserFollowingList(userId: number, page: number, limit: number) {
    const [items, total] = await this.followRepository.findAndCount({
      where: { userId },
      relations: ['targetUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return {
      list: items.map(f => ({
        id: f.id,
        targetUserId: f.targetUserId,
        nickname: f.targetUser?.nickname || '',
        avatar: normalizeImageUrl(f.targetUser?.avatar),
        createdAt: f.createdAt,
      })),
      total,
    }
  }

  async getUserFollowersList(userId: number, page: number, limit: number) {
    const [items, total] = await this.followRepository.findAndCount({
      where: { targetUserId: userId },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return {
      list: items.map(f => ({
        id: f.id,
        userId: f.userId,
        nickname: f.user?.nickname || '',
        avatar: normalizeImageUrl(f.user?.avatar),
        createdAt: f.createdAt,
      })),
      total,
    }
  }

  async adminAddFollow(userId: number, targetUserId: number) {
    const exists = await this.followRepository.findOne({ where: { userId, targetUserId } })
    if (exists) return
    await this.followRepository.save({ userId, targetUserId })
  }

  async adminRemoveFollow(userId: number, targetUserId: number) {
    const follow = await this.followRepository.findOne({ where: { userId, targetUserId } })
    if (!follow) return
    await this.followRepository.remove(follow)
  }

  // ===== 喜欢管理 =====

  async getUserLikeStats(userId: number) {
    const [liked, likedBy, mutual] = await Promise.all([
      this.followRepository.count({ where: { userId } }),
      this.followRepository.count({ where: { targetUserId: userId } }),
      this.getMutualCount(userId),
    ])
    return { liked, likedBy, mutual }
  }

  private async getMutualCount(userId: number): Promise<number> {
    const myLikes = await this.followRepository.find({ where: { userId }, select: ['targetUserId'] })
    if (myLikes.length === 0) return 0
    return this.followRepository.count({
      where: { userId: In(myLikes.map(f => f.targetUserId)), targetUserId: userId },
    })
  }

  async getUserLikesList(
    userId: number,
    type: 'liked' | 'likedBy' | 'mutual',
    page: number,
    limit: number,
  ) {
    if (type === 'liked') {
      const [items, total] = await this.followRepository.findAndCount({
        where: { userId },
        relations: ['targetUser'],
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      })
      return {
        list: items.map(f => ({
          id: f.id,
          targetUserId: f.targetUserId,
          nickname: f.targetUser?.nickname || '',
          avatar: normalizeImageUrl(f.targetUser?.avatar),
          age: f.targetUser?.birthYear ? new Date().getFullYear() - f.targetUser.birthYear : 0,
          gender: f.targetUser?.gender || 0,
          location: f.targetUser?.residence || f.targetUser?.hometown || '',
          createdAt: f.createdAt,
        })),
        total,
      }
    }

    if (type === 'likedBy') {
      const [items, total] = await this.followRepository.findAndCount({
        where: { targetUserId: userId },
        relations: ['user'],
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      })
      return {
        list: items.map(f => ({
          id: f.id,
          targetUserId: f.userId,
          nickname: f.user?.nickname || '',
          avatar: normalizeImageUrl(f.user?.avatar),
          age: f.user?.birthYear ? new Date().getFullYear() - f.user.birthYear : 0,
          gender: f.user?.gender || 0,
          location: f.user?.residence || f.user?.hometown || '',
          createdAt: f.createdAt,
        })),
        total,
      }
    }

    // mutual
    const myLikes = await this.followRepository.find({ where: { userId }, select: ['targetUserId'] })
    if (myLikes.length === 0) return { list: [], total: 0 }

    const myLikeTargetIds = myLikes.map(f => f.targetUserId)
    const [items, total] = await this.followRepository.findAndCount({
      where: { userId: In(myLikeTargetIds), targetUserId: userId },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
    return {
      list: items.map(f => ({
        id: f.id,
        targetUserId: f.userId,
        nickname: f.user?.nickname || '',
        avatar: normalizeImageUrl(f.user?.avatar),
        age: f.user?.birthYear ? new Date().getFullYear() - f.user.birthYear : 0,
        gender: f.user?.gender || 0,
        location: f.user?.residence || f.user?.hometown || '',
        createdAt: f.createdAt,
      })),
      total,
    }
  }

  async adminAddLike(userId: number, targetUserId: number) {
    const exists = await this.followRepository.findOne({ where: { userId, targetUserId } })
    if (exists) return
    await this.followRepository.save({ userId, targetUserId })
  }

  async adminRemoveLike(userId: number, targetUserId: number) {
    const follow = await this.followRepository.findOne({ where: { userId, targetUserId } })
    if (!follow) return
    await this.followRepository.remove(follow)
  }

  async searchUsers(keyword: string) {
    if (!keyword || keyword.length < 1) return []
    const users = await this.userRepository.find({
      where: [
        { nickname: Like(`%${keyword}%`), isDeleted: 0 },
      ],
      select: ['id', 'nickname', 'avatar'],
      take: 20,
    })
    return users
  }

  // ===== 浏览记录管理 =====

  async getUserViewDetail(userId: number, page = 1, limit = 20) {
    const result = await this.visitRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.user', 'targetUser')
      .where('v.visitorUserId = :userId', { userId })
      .orderBy('v.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const total = await this.visitRepository.count({ where: { visitorUserId: userId } })

    const list = result.map(v => ({
      id: v.id,
      targetUserId: v.userId,
      userId: v.visitorUserId,
      nickname: (v as any)?.user?.nickname || '',
      avatar: normalizeImageUrl((v as any)?.user?.avatar),
      createdAt: v.createdAt,
    }))

    return { list, total, page, limit }
  }

  async getUserViewDetailGrouped(userId: number) {
    const result = await this.visitRepository
      .createQueryBuilder('v')
      .leftJoin('v.user', 'targetUser')
      .select('v.userId', 'targetUserId')
      .addSelect('targetUser.nickname', 'nickname')
      .addSelect('targetUser.avatar', 'avatar')
      .addSelect('MAX(v.createdAt)', 'lastViewedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .where('v.visitorUserId = :userId', { userId })
      .groupBy('v.userId')
      .addGroupBy('targetUser.nickname')
      .addGroupBy('targetUser.avatar')
      .orderBy('lastViewedAt', 'DESC')
      .getRawMany()

    return result.map(r => ({
      targetUserId: Number(r.targetUserId),
      nickname: r.nickname || '',
      avatar: normalizeImageUrl(r.avatar),
      lastViewedAt: r.lastViewedAt,
      viewCount: Number(r.viewCount),
    }))
  }

  async getUserVisitorDetailGrouped(userId: number) {
    const result = await this.visitRepository
      .createQueryBuilder('v')
      .leftJoin('v.visitorUser', 'visitorUser')
      .select('v.visitorUserId', 'visitorUserId')
      .addSelect('visitorUser.nickname', 'nickname')
      .addSelect('visitorUser.avatar', 'avatar')
      .addSelect('MAX(v.createdAt)', 'lastVisitedAt')
      .addSelect('COUNT(v.id)', 'viewCount')
      .where('v.userId = :userId', { userId })
      .groupBy('v.visitorUserId')
      .addGroupBy('visitorUser.nickname')
      .addGroupBy('visitorUser.avatar')
      .orderBy('lastVisitedAt', 'DESC')
      .getRawMany()

    return result.map(r => ({
      visitorUserId: Number(r.visitorUserId),
      nickname: r.nickname || '',
      avatar: normalizeImageUrl(r.avatar),
      lastVisitedAt: r.lastVisitedAt,
      viewCount: Number(r.viewCount),
    }))
  }

  /** 单个用户更新标签（去重），同时记录审计日志 */
  async updateTags(userId: number, tags: string[]) {
    const user = await this.userRepository.findOne({ where: { id: userId, isDeleted: 0 } })
    if (!user) throw new Error('用户不存在')

    const uniqueTags = [...new Set(tags.filter(Boolean))]
    await this.userRepository.update(userId, { tags: uniqueTags as any })

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        targetType: 'user',
        targetId: userId,
        action: 'UPDATE_TAGS',
        content: JSON.stringify({ tags: uniqueTags }),
      }),
    )

    return { userId, tags: uniqueTags }
  }

  /** 批量更新标签：为每个用户追加新标签（去重，不覆盖已有标签），使用事务 */
  async batchUpdateTags(userIds: number[], tags: string[]) {
    const newTags = [...new Set(tags.filter(Boolean))]
    if (newTags.length === 0 || userIds.length === 0) return 0

    let updatedCount = 0
    await this.userRepository.manager.transaction(async (manager) => {
      for (const userId of userIds) {
        const user = await manager.findOne(User, { where: { id: userId, isDeleted: 0 } })
        if (!user) continue

        const existing: string[] = Array.isArray(user.tags) ? user.tags : []
        const merged = [...new Set([...existing, ...newTags])]
        await manager.update(User, userId, { tags: merged as any })
        updatedCount++
      }

      // 审计日志在事务内部，确保事务回滚时一并回滚
      const auditLog = manager.create(AuditLog, {
        targetType: 'user',
        targetId: 0,
        action: 'BATCH_UPDATE_TAGS',
        content: JSON.stringify({ userIds, tags: newTags }),
      })
      await manager.save(AuditLog, auditLog)
    })

    return updatedCount
  }
}

/**
 * simple-json 字段在 getRawAndEntities 后可能为原始 JSON 字符串，
 * 需要手动解析为数组。如果已经是数组则直接返回。
 */
function parseSimpleJson(value: any): any {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value // Already parsed by TypeORM simple-json column
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed // Can be array or object
    } catch {
      return null
    }
  }
  return null
}

/** 同上但始终返回数组（失败时返回 []） */
function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  return []
}
