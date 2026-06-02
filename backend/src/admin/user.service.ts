import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserNotification } from '../entities/UserNotification'
import { AuditLog } from '../entities/AuditLog'
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
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  education?: string
  occupation?: string
  tags?: string[]
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

    // Add audit status subqueries
    queryBuilder
      .addSelect(subQuery => 
        subQuery
          .select('a.action', 'profileAuditAction')
          .from(AuditLog, 'a')
          .where('a.targetType = :userType', { userType: 'user' })
          .andWhere('a.targetId = user.id')
          .orderBy('a.createdAt', 'DESC')
          .limit(1),
        'profileAuditStatus'
      )
      .addSelect(subQuery =>
        subQuery
          .select('a.action', 'photoAuditAction')
          .from(AuditLog, 'a')
          .where('a.targetType = :photoType', { photoType: 'photo' })
          .andWhere('a.targetId = user.id')
          .orderBy('a.createdAt', 'DESC')
          .limit(1),
        'photoAuditStatus'
      )

    queryBuilder.skip(skip).take(limit)

    const { entities, raw } = await queryBuilder.getRawAndEntities()

    // Merge audit status from raw subqueries
    const users = entities.map((user, index) => ({
      ...user,
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : null,
      profileAuditStatus: raw[index]?.profileAuditStatus || 'unsubmitted',
      photoAuditStatus: raw[index]?.photoAuditStatus || 'unsubmitted',
    }))

    return {
      list: users,
      page,
      limit,
      total: await queryBuilder.getCount(),
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
    return { ...safeUser, photos, age: user.birthYear ? new Date().getFullYear() - user.birthYear : null }
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

  async sendNotification(id: number, content: string) {
    // TODO: Implement notification sending via push service
    console.log(`Sending notification to user ${id}: ${content}`)
  }

  async getPhotos(userId: number) {
    return this.userPhotoRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
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
    occupation?: string
    hometown?: string
    residence?: string
    status?: number
  }) {
    const hashedPassword = await bcrypt.hash(data.password || '123456', 10)
    
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
      occupation: data.occupation || null,
      hometown: data.hometown || null,
      residence: data.residence || null,
      status: data.status !== undefined ? data.status : 1,
      isVip: 0,
      vipLevel: 0,
      openid: null,
      unionId: null,
    })

    return this.userRepository.save(user)
  }

  async updateUser(id: number, data: Partial<User>) {
    const allowedFields = [
      'nickname', 'avatar', 'gender', 'birthYear', 'height', 'weight',
      'education', 'occupation', 'incomeRange', 'housingStatus', 'carStatus',
      'maritalStatus', 'hometown', 'residence', 'selfIntro', 'mateRequirement',
      'isRealName', 'status', 'phone', 'tags', 'adminRemark',
    ]

    const safeData: any = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        safeData[key] = data[key]
      }
    }

    await this.userRepository.update(id, safeData)
  }
}
