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

    if (filter.keyword) {
      queryBuilder.where(
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
    return this.userRepository.findOne({ where: { id } })
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
      vipExpireTime: level > 0 ? expireTime.toISOString() : null,
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
}
