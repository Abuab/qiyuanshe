import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
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
  tags?: string[]
}

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
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

    return {
      list: users,
      page,
      limit,
      total,
    }
  }

  async export(filter: UserFilter) {
    const users = await this.list({ ...filter, page: 1, limit: 10000 })
    return users.list
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
      'isRealName', 'status', 'phone', 'tags',
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
