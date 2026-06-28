import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOptionsWhere, Repository } from 'typeorm'
import { Circle } from '../entities/Circle'
import { CirclePost } from '../entities/CirclePost'
import { CircleMember } from '../entities/CircleMember'
import { User } from '../entities/User'

@Injectable()
export class CircleService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,
    @InjectRepository(CirclePost)
    private readonly postRepo: Repository<CirclePost>,
    @InjectRepository(CircleMember)
    private readonly memberRepo: Repository<CircleMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  async getCircleUsers(circleId: number, page = 1, limit = 10) {
    // 通过圈子成员关联表查询
    const qb = this.userRepo.createQueryBuilder('user')
      .innerJoin('circle_members', 'cm', 'cm.userId = user.id')
      .where('cm.circleId = :circleId', { circleId })
      .andWhere('user.status = 2')
      .andWhere('user.isDeleted = 0')
      .orderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [list, total] = await qb.getManyAndCount()

    // 查询每个用户的头像/照片
    const userIds = list.map(u => u.id)
    const photosQuery = userIds.length > 0
      ? await this.userRepo.createQueryBuilder('user')
          .leftJoinAndSelect('user.photos', 'photo')
          .where('user.id IN (:...ids)', { ids: userIds })
          .andWhere('photo.isMain = 1 OR photo.auditStatus = 1')
          .orderBy('photo.sortOrder', 'ASC')
          .getMany()
      : []
    const photoMap = new Map<number, string[]>()
    for (const u of photosQuery) {
      photoMap.set(u.id, (u as any).photos?.map((p: any) => p.photoUrl) || [])
    }
    const result = list.map(user => {
      const age = user.birthYear ? new Date().getFullYear() - user.birthYear : 0
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        age,
        gender: user.gender,
        height: user.height,
        education: user.education,
        occupation: user.occupation,
        incomeRange: user.incomeRange,
        housingStatus: user.housingStatus,
        residence: user.residence,
        isRealName: user.isRealName === 1,
        photos: photoMap.get(user.id) || [],
      }
    })
    return { list: result, total, page, limit }
  }

  async getPosts(circleId: number, page = 1, limit = 10) {
    const [list, total] = await this.postRepo.findAndCount({
      where: { circleId, status: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }

  async createPost(data: { circleId: number; userId: number; content: string; images: string[] }) {
    const post = this.postRepo.create({
      ...data,
      likes: 0,
      comments: 0,
      status: 1,
    })
    return this.postRepo.save(post)
  }

  async getPostDetail(id: number) {
    return this.postRepo.findOne({ where: { id } })
  }

  async deletePost(id: number) {
    await this.postRepo.update(id, { status: 0 })
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
    // 先删除该圈子下的成员、帖子
    await this.memberRepo.delete({ circleId: id } as any)
    await this.postRepo.delete({ circleId: id } as any)
    // 再硬删除圈子
    await this.circleRepo.delete(id)
  }

  // ========== 圈子成员管理 ==========

  async getCircleMembers(circleId: number) {
    const members = await this.memberRepo.find({
      where: { circleId } as any,
      order: { createdAt: 'DESC' },
    })
    if (members.length === 0) return []
    const userIds = members.map(m => m.userId)
    const users = await this.userRepo.createQueryBuilder('user')
      .select(['user.id', 'user.nickname', 'user.avatar'])
      .where('user.id IN (:...ids)', { ids: userIds })
      .getMany()
    return users
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
      .where('user.nickname LIKE :kw', { kw: `%${keyword.trim()}%` })
      .andWhere('user.status = 2')
      .andWhere('user.isDeleted = 0')
      .take(20)
      .getMany()
  }

  async getPostsAll(page = 1, limit = 10, status?: number) {
    const where: FindOptionsWhere<CirclePost> = {}
    if (status !== undefined && status !== null) {
      where.status = status
    }
    const [list, total] = await this.postRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }

  async auditPost(id: number, status: number) {
    await this.postRepo.update(id, { status })
  }
}
