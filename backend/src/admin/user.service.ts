import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In, DataSource } from 'typeorm'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserNotification } from '../entities/UserNotification'
import { AuditLog } from '../entities/AuditLog'
import { normalizeImageUrl } from '../common/image-url'
import * as bcrypt from 'bcrypt'

interface UserFilter {
  page?: number
  limit?: number
  keyword?: string
  gender?: number
  status?: number
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
    private readonly dataSource: DataSource,
  ) {}

  async list(filter: UserFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.userRepository.createQueryBuilder('user')

    queryBuilder.where('user.id != :adminId', { adminId: 1 })

    queryBuilder.andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })

    if (filter.keyword) {
      queryBuilder.andWhere(
        '(user.nickname LIKE :keyword OR user.id = :id OR user.phone LIKE :phone)',
        {
          keyword: `%${filter.keyword}%`,
          id: parseInt(filter.keyword) || 0,
          phone: `%${filter.keyword}%`,
        },
      )
    }

    if (filter.gender) {
      queryBuilder.andWhere('user.gender = :gender', { gender: filter.gender })
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status: filter.status })
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

    // Merge audit status from bulk queries
    const result = users.map(user => {
      // 将 simple-json 字段强制转纯 JS 数组，确保 JSON 序列化正确
      const tags = ensureArray(user.tags)
      const personalityTags = ensureArray(user.personalityTags)
      const hopeTaTags = ensureArray(user.hopeTaTags)

      // 直接用显式字段构建纯对象，绕过 TypeORM entity 的序列化陷阱
      return {
        id: user.id,
        nickname: user.nickname,
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
        isVip: user.isVip,
        vipLevel: user.vipLevel,
        vipExpireTime: user.vipExpireTime,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        tags,
        personalityTags,
        hopeTaTags,
        adminRemark: user.adminRemark,
        age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
        profileAuditStatus: profileAuditMap.get(user.id) || 'unsubmitted',
        photoAuditStatus: photoAuditMap.get(user.id) || 'unsubmitted',
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
    const { password, ...safeUser } = user
    return {
      ...safeUser,
      avatar: normalizeImageUrl(safeUser.avatar),
      // simple-json 列兜底解析，避免 findOne 未正确反序列化
      tags: parseSimpleJson(safeUser.tags),
      personalityTags: parseSimpleJson(safeUser.personalityTags),
      hopeTaTags: parseSimpleJson(safeUser.hopeTaTags),
      photos: photos.map(p => ({ ...p, photoUrl: normalizeImageUrl(p.photoUrl) })),
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
    }
  }

  async updateStatus(id: number, status: number) {
    await this.userRepository.update(id, { status })
  }

  async updateVip(id: number, level: number, days: number) {
    const user = await this.userRepository.findOne({ where: { id } })
    if (!user) return

    const now = new Date()
    const expireTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    await this.userRepository.update(id, {
      isVip: level > 0 ? 1 : 0,
      vipLevel: level,
      vipExpireTime: level > 0 ? expireTime : null,
    })
  }

  async resetPassword(id: number) {
    const hashedPassword = await bcrypt.hash('123456', 10)
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
    return this.userPhotoRepository.save(photo)
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
    const hashedPassword = await bcrypt.hash(data.password || '123456', 10)
    
    // 管理员手动创建的用户默认为待审核状态(status=2)
    const status = data.status !== undefined ? data.status : 2
    
    // 处理 personalityTags / hopeTaTags: 兼容逗号分隔字符串和数组
    const personalityTags = Array.isArray(data.personalityTags)
      ? data.personalityTags
      : data.personalityTags
        ? data.personalityTags.split(',').map((s: string) => s.trim()).filter(Boolean)
        : null
    const hopeTaTags = Array.isArray(data.hopeTaTags)
      ? data.hopeTaTags
      : data.hopeTaTags
        ? data.hopeTaTags.split(',').map((s: string) => s.trim()).filter(Boolean)
        : null

    const user = this.userRepository.create({
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
      'nickname', 'avatar', 'gender', 'birthYear', 'height', 'weight',
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

    console.log(`[Admin] updateUser id=${id} safeData keys:`, Object.keys(safeData))
    console.log(`[Admin] safeData.personalityTags =`, JSON.stringify(safeData.personalityTags), `type =`, typeof safeData.personalityTags)
    console.log(`[Admin] safeData.hopeTaTags =`, JSON.stringify(safeData.hopeTaTags), `type =`, typeof safeData.hopeTaTags)
    // tags 同理
    if (safeData.tags && typeof safeData.tags === 'string') {
      safeData.tags = safeData.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    if (data['password']) {
      safeData['password'] = await bcrypt.hash(data['password'], 10)
    }

    await this.userRepository.update(id, safeData)
    // 验证写入结果
    const verify = await this.dataSource.query(`SELECT personalityTags, hopeTaTags FROM users WHERE id = ?`, [id])
    console.log(`[Admin] DB verify userId=${id} personalityTags=`, JSON.stringify(verify[0]?.personalityTags), `hopeTaTags=`, JSON.stringify(verify[0]?.hopeTaTags))
  }
}

/**
 * simple-json 字段在 getRawAndEntities 后可能为原始 JSON 字符串，
 * 需要手动解析为数组。如果已经是数组则直接返回。
 */
function parseSimpleJson(value: any): any[] | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
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
