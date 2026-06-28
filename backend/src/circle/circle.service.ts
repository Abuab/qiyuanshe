import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOptionsWhere, Repository } from 'typeorm'
import { Circle } from '../entities/Circle'
import { CirclePost } from '../entities/CirclePost'
import { User } from '../entities/User'

@Injectable()
export class CircleService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,
    @InjectRepository(CirclePost)
    private readonly postRepo: Repository<CirclePost>,
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
    const [list, total] = await this.userRepo.findAndCount({
      select: [
        'id', 'nickname', 'avatar', 'age', 'gender', 'height',
        'education', 'occupation', 'incomeRange', 'housingStatus',
        'residence', 'isRealName', 'status', 'birthYear',
      ],
      where: { status: 2, isDeleted: 0 } as any,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: limit,
    })
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
    await this.circleRepo.update(id, { status: 0 })
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
