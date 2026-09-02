import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Circle } from '../entities/Circle'
import { CircleMember } from '../entities/CircleMember'
import { User } from '../entities/User'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { Follow } from '../entities/Follow'
import { resolveAvatarUrl } from '../common/image-url'

@Injectable()
export class CircleService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,
    @InjectRepository(CircleMember)
    private readonly memberRepo: Repository<CircleMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
  ) {}

  // ========== 小程序端 ==========

  async getCircles() {
    return this.circleRepo.find({
      where: { status: 1 },
      order: { sort: 'ASC' },
    })
  }

  async getCircleDetail(id: number) {
    return this.circleRepo.findOne({ where: { id } })
  }

  async getCircleUsers(circleId: number, page = 1, limit = 10, currentUserId?: number) {
    // 第一步：从 circle_members 查出该圈子的成员，按 sortOrder 排序
    const members = await this.memberRepo.find({
      where: { circleId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })

    if (members.length === 0) {
      return { list: [], total: 0, page, limit }
    }

    const memberUserIds = members.map(m => m.userId)

    // 第二步：按当前用户性别做互推过滤（男→女，女→男；未登录不限制），与首页用户列表一致
    let targetGender: number | undefined
    if (currentUserId) {
      const currentUser = await this.userRepo.findOne({
        where: { id: currentUserId },
        select: ['gender'],
      })
      if (currentUser?.gender === 1) targetGender = 2
      else if (currentUser?.gender === 2) targetGender = 1
    }

    // 第三步：过滤出有效成员（status=1、isDeleted=0，且满足性别互推），保持成员 sortOrder 顺序
    const validQb = this.userRepo
      .createQueryBuilder('user')
      .select('user.id')
      .where('user.id IN (:...ids)', { ids: memberUserIds })
      .andWhere('user.status = 1')
      .andWhere('user.isDeleted = 0')

    if (targetGender !== undefined) {
      validQb.andWhere('user.gender = :gender', { gender: targetGender })
    }

    // 排除当前登录用户自己（与首页 buildBaseQuery 的 user.id != :selfId 一致）
    if (currentUserId) {
      validQb.andWhere('user.id != :selfId', { selfId: currentUserId })
    }

    const validUsers = await validQb.getMany()
    const validIdSet = new Set(validUsers.map(u => u.id))
    const validOrderedIds = memberUserIds.filter(id => validIdSet.has(id))

    const total = validOrderedIds.length
    const pagedUserIds = validOrderedIds.slice((page - 1) * limit, page * limit)

    if (pagedUserIds.length === 0) {
      return { list: [], total, page, limit }
    }

    // 第四步：查询用户完整信息（保持 sortOrder 顺序）
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.id IN (:...ids)', { ids: pagedUserIds })
      .andWhere('user.status = 1')
      .andWhere('user.isDeleted = 0')
      .getMany()

    // 按成员 sortOrder 恢复顺序
    const userMap = new Map(users.map(u => [u.id, u]))
    const list = pagedUserIds.map(id => userMap.get(id)).filter(Boolean)

    // 查询每个用户的头像/照片、红娘评语，以及当前登录用户对这些用户的喜欢(关注)关系
    const userIds = list.map(u => u.id)
    const [photosMap, commentsMap, followedIds] = await Promise.all([
      this.getPhotosMap(userIds),
      this.getCommentsMap(userIds),
      currentUserId && userIds.length > 0
        ? this.followRepo
            .find({ where: { userId: currentUserId }, select: ['targetUserId'] })
            .then(follows => follows.map(f => f.targetUserId))
        : Promise.resolve<number[]>([]),
    ])

    const result = list.map(user => {
      const age = user.birthYear ? new Date().getFullYear() - user.birthYear : 0
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: resolveAvatarUrl(user.avatar),
        age,
        height: user.height,
        education: user.education,
        occupation: user.occupation,
        incomeRange: user.incomeRange,
        housingStatus: user.housingStatus,
        isRealName: user.isRealName === 1,
        photos: photosMap.get(user.id) || [],
        matchmakerComment: commentsMap.get(user.id) || '',
        hasVoice: !!(user.voiceUrl && user.voiceAuditStatus === 1),
        isFollowed: followedIds.includes(user.id),
        isLiked: followedIds.includes(user.id),
      }
    })
    return { list: result, total, page, limit }
  }

  private async getPhotosMap(userIds: number[]): Promise<Map<number, string[]>> {
    if (userIds.length === 0) return new Map()
    const photosQuery = await this.userRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.photos', 'photo', 'photo.auditStatus = :auditStatus', { auditStatus: 1 })
      .where('user.id IN (:...ids)', { ids: userIds })
      .orderBy('photo.sortOrder', 'ASC')
      .getMany()
    const map = new Map<number, string[]>()
    for (const u of photosQuery) {
      map.set(u.id, (u as any).photos?.map((p: any) => p.photoUrl) || [])
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

  // ========== 管理后台 ==========

  async getCirclesAll() {
    return this.circleRepo.find({ order: { sort: 'ASC' } })
  }

  async createCircle(data: { name: string; icon: string; bannerImage?: string; description: string; sort: number }) {
    const circle = this.circleRepo.create(data)
    return this.circleRepo.save(circle)
  }

  async updateCircle(id: number, data: { name?: string; icon?: string; bannerImage?: string; description?: string; sort?: number; status?: number }) {
    await this.circleRepo.update(id, data)
    return this.circleRepo.findOne({ where: { id } })
  }

  async deleteCircle(id: number) {
    // 先删除该圈子下的成员
    await this.memberRepo.delete({ circleId: id } as any)
    // 再硬删除圈子
    await this.circleRepo.delete(id)
  }

  // ========== 管理后台 - 用户全量搜索（穿梭框左侧数据源） ==========

  async getAllUsers(page = 1, limit = 20, keyword?: string) {
    const qb = this.userRepo.createQueryBuilder('user')
      .select([
        'user.id',
        'user.nickname',
        'user.avatar',
        'user.gender',
        'user.birthYear',
        'user.status',
        'user.isDeleted',
      ])
      .where('user.status = 1')
      .andWhere('user.isDeleted = 0')

    if (keyword && keyword.trim().length > 0) {
      qb.andWhere(
        '(user.nickname LIKE :kw OR user.userId LIKE :kw OR CAST(user.id AS CHAR) LIKE :kw)',
        { kw: `%${keyword.trim()}%` },
      )
    }

    qb.orderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [list, total] = await qb.getManyAndCount()

    const result = list.map(user => {
      const age = user.birthYear ? new Date().getFullYear() - user.birthYear : 0
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: resolveAvatarUrl(user.avatar),
        gender: user.gender,
        age,
      }
    })

    return { list: result, total, page, limit }
  }

  // ========== 圈子成员管理 ==========

  async getCircleMembers(circleId: number) {
    const members = await this.memberRepo.find({
      where: { circleId } as any,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    if (members.length === 0) return []
    const userIds = members.map(m => m.userId)
    // 构建 userId → sortOrder 的映射
    const sortMap = new Map<number, number>()
    for (const m of members) {
      sortMap.set(m.userId, m.sortOrder ?? 0)
    }
    const users = await this.userRepo.createQueryBuilder('user')
      .select(['user.id', 'user.nickname', 'user.avatar', 'user.gender', 'user.birthYear'])
      .where('user.id IN (:...ids)', { ids: userIds })
      .getMany()
    // 按 members 中的排序顺序返回
    const userMap = new Map(users.map(u => [u.id, u]))
    return members.map(m => {
      const u = userMap.get(m.userId)
      if (!u) return null
      const age = u.birthYear ? new Date().getFullYear() - u.birthYear : 0
      return {
        id: u.id,
        nickname: u.nickname,
        avatar: resolveAvatarUrl(u.avatar),
        gender: u.gender,
        age,
        sortOrder: sortMap.get(u.id) ?? 0,
      }
    }).filter(Boolean)
  }

  async saveCircleMembersBatch(circleId: number, members: { userId: number; sortOrder: number }[]) {
    // 使用事务：确保删除旧成员和插入新成员原子执行
    await this.memberRepo.manager.transaction(async (manager) => {
      await manager.delete(CircleMember, { circleId } as any)
      if (members.length > 0) {
        const entities = members.map(m => manager.create(CircleMember, {
          circleId,
          userId: m.userId,
          sortOrder: m.sortOrder,
        }))
        await manager.save(entities)
      }
    })
  }

  async addCircleMember(circleId: number, userId: number) {
    const exist = await this.memberRepo.findOne({ where: { circleId, userId } as any })
    if (exist) return exist
    const member = this.memberRepo.create({ circleId, userId })
    return this.memberRepo.save(member)
  }

  async removeCircleMember(circleId: number, userId: number) {
    await this.memberRepo.delete({ circleId, userId } as any)
  }

  async searchUsers(keyword: string) {
    if (!keyword || keyword.trim().length === 0) return []
    return this.userRepo.createQueryBuilder('user')
      .select(['user.id', 'user.nickname', 'user.avatar'])
      .where('(user.nickname LIKE :kw OR user.userId LIKE :kw)', { kw: `%${keyword.trim()}%` })
      .andWhere('user.status = 1')
      .andWhere('user.isDeleted = 0')
      .take(20)
      .getMany()
  }
}
