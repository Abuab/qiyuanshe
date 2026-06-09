import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOptionsWhere, Repository } from 'typeorm'
import { Circle } from '../entities/Circle'
import { CirclePost } from '../entities/CirclePost'

@Injectable()
export class CircleService {
  constructor(
    @InjectRepository(Circle)
    private readonly circleRepo: Repository<Circle>,
    @InjectRepository(CirclePost)
    private readonly postRepo: Repository<CirclePost>,
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

  async createCircle(data: { name: string; icon: string; description: string; sort: number }) {
    const circle = this.circleRepo.create(data)
    return this.circleRepo.save(circle)
  }

  async updateCircle(id: number, data: { name?: string; icon?: string; description?: string; sort?: number; status?: number }) {
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
