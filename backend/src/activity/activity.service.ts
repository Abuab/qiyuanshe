import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Activity } from '../entities/Activity'
import { ActivitySignup } from '../entities/ActivitySignup'
import { User } from '../entities/User'
import { CreateActivityDto, UpdateActivityDto } from './dto'

interface ActivityFilter {
  page?: number
  limit?: number
  keyword?: string
  activityType?: string
  status?: number
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivitySignup)
    private readonly signupRepository: Repository<ActivitySignup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 小程序端 - 获取活动列表
  async getActivityList(type: string, page = 1, limit = 10) {
    const queryBuilder = this.activityRepository.createQueryBuilder('activity')
      .where('activity.isActive = :isActive', { isActive: 1 })

    if (type && type !== 'all') {
      queryBuilder.andWhere('activity.activityType = :type', { type })
    }

    queryBuilder
      .orderBy('activity.sortOrder', 'ASC')
      .addOrderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [activities, total] = await queryBuilder.getManyAndCount()

    return {
      list: activities,
      page,
      limit,
      total,
    }
  }

  // 小程序端 - 获取活动详情
  async getActivityDetail(id: number) {
    const activity = await this.activityRepository.findOne({ where: { id } })
    if (!activity) {
      throw new NotFoundException('活动不存在')
    }

    // 获取已报名用户头像列表（最多10个）
    const signups = await this.signupRepository
      .createQueryBuilder('signup')
      .leftJoinAndSelect(User, 'user', 'user.id = signup.userId')
      .where('signup.activityId = :activityId', { activityId: id })
      .andWhere('signup.status != :cancelled', { cancelled: 2 })
      .select(['user.avatar as avatar'])
      .limit(10)
      .getRawMany()

    return {
      ...activity,
      signupAvatars: signups.map(s => s.avatar).filter(Boolean),
    }
  }

  // 小程序端 - 报名
  async signup(activityId: number, userId: number, data: { realName?: string; phone?: string; remark?: string }) {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } })
    if (!activity) {
      throw new NotFoundException('活动不存在')
    }

    if (activity.status !== 1) {
      throw new BadRequestException('活动不在进行中')
    }

    if (activity.maxParticipants > 0 && activity.currentParticipants >= activity.maxParticipants) {
      throw new BadRequestException('活动已满员')
    }

    // 检查是否已报名
    const existingSignup = await this.signupRepository.findOne({
      where: { activityId, userId },
    })
    if (existingSignup) {
      throw new BadRequestException('您已报名该活动')
    }

    // 创建报名记录
    const signup = this.signupRepository.create({
      activityId,
      userId,
      realName: data.realName,
      phone: data.phone,
      remark: data.remark,
      status: 0,
    })

    await this.signupRepository.save(signup)

    // 更新当前报名人数
    await this.activityRepository.increment({ id: activityId }, 'currentParticipants', 1)

    return signup
  }

  // 小程序端 - 获取已报名用户头像列表
  async getSignupAvatars(activityId: number) {
    const signups = await this.signupRepository
      .createQueryBuilder('signup')
      .leftJoinAndSelect(User, 'user', 'user.id = signup.userId')
      .where('signup.activityId = :activityId', { activityId })
      .andWhere('signup.status != :cancelled', { cancelled: 2 })
      .select(['user.avatar as avatar'])
      .limit(10)
      .getRawMany()

    return signups.map(s => s.avatar).filter(Boolean)
  }

  // 后台管理 - 获取活动列表
  async getAdminList(filter: ActivityFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 10
    const skip = (page - 1) * limit

    const queryBuilder = this.activityRepository.createQueryBuilder('activity')

    if (filter.keyword) {
      queryBuilder.where('activity.title LIKE :keyword', {
        keyword: `%${filter.keyword}%`,
      })
    }

    if (filter.activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType: filter.activityType,
      })
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('activity.status = :status', { status: filter.status })
    }

    queryBuilder
      .orderBy('activity.sortOrder', 'ASC')
      .addOrderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [activities, total] = await queryBuilder.getManyAndCount()

    return {
      list: activities,
      page,
      limit,
      total,
    }
  }

  // 后台管理 - 创建活动
  async create(data: CreateActivityDto) {
    const activity = this.activityRepository.create({
      ...data,
      currentParticipants: 0,
    } as any)
    return this.activityRepository.save(activity)
  }

  // 后台管理 - 更新活动
  async update(id: number, data: UpdateActivityDto) {
    const activity = await this.activityRepository.findOne({ where: { id } })
    if (!activity) {
      throw new NotFoundException('活动不存在')
    }

    await this.activityRepository.update(id, data as any)
    return this.activityRepository.findOne({ where: { id } })
  }

  // 后台管理 - 更新活动状态
  async updateStatus(id: number, status: number) {
    const activity = await this.activityRepository.findOne({ where: { id } })
    if (!activity) {
      throw new NotFoundException('活动不存在')
    }

    await this.activityRepository.update(id, { status } as any)
    return { success: true }
  }

  // 后台管理 - 删除活动
  async delete(id: number) {
    const activity = await this.activityRepository.findOne({ where: { id } })
    if (!activity) {
      throw new NotFoundException('活动不存在')
    }

    await this.activityRepository.delete(id)
    return { success: true }
  }

  // 后台管理 - 获取报名列表
  async getSignupList(activityId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const queryBuilder = this.signupRepository
      .createQueryBuilder('signup')
      .leftJoinAndSelect(User, 'user', 'user.id = signup.userId')
      .where('signup.activityId = :activityId', { activityId })
      .select([
        'signup.id as id',
        'signup.activityId as activityId',
        'signup.userId as userId',
        'signup.realName as realName',
        'signup.phone as phone',
        'signup.remark as remark',
        'signup.status as status',
        'signup.createdAt as createdAt',
        'user.nickname as nickname',
        'user.avatar as userAvatar',
      ])
      .orderBy('signup.createdAt', 'DESC')
      .skip(skip)
      .take(limit)

    const [signups, total] = await Promise.all([
      queryBuilder.getRawMany(),
      this.signupRepository.count({ where: { activityId } }),
    ])

    return {
      list: signups,
      page,
      limit,
      total,
    }
  }

  // 后台管理 - 确认报名
  async confirmSignup(signupId: number) {
    const signup = await this.signupRepository.findOne({ where: { id: signupId } })
    if (!signup) {
      throw new NotFoundException('报名记录不存在')
    }

    await this.signupRepository.update(signupId, { status: 1 })
    return { success: true }
  }

  // 后台管理 - 取消报名
  async cancelSignup(signupId: number) {
    const signup = await this.signupRepository.findOne({ where: { id: signupId } })
    if (!signup) {
      throw new NotFoundException('报名记录不存在')
    }

    await this.signupRepository.update(signupId, { status: 2 })

    // 减少报名人数
    await this.activityRepository.decrement(
      { id: signup.activityId },
      'currentParticipants',
      1,
    )

    return { success: true }
  }

  // 获取报名统计
  async getSignupStats(activityId: number) {
    const total = await this.signupRepository.count({ where: { activityId } })
    const pending = await this.signupRepository.count({
      where: { activityId, status: 0 },
    })
    const confirmed = await this.signupRepository.count({
      where: { activityId, status: 1 },
    })

    return { total, pending, confirmed }
  }
}
