import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'

@Injectable()
export class DynamicService {
  constructor(
    @InjectRepository(Dynamic)
    private readonly dynamicRepository: Repository<Dynamic>,
    @InjectRepository(DynamicLike)
    private readonly dynamicLikeRepository: Repository<DynamicLike>,
    private readonly dataSource: DataSource,
  ) {}

  async getDynamics(page: number, limit: number, currentUserId?: number) {
    const where: any = { status: 1 }
    // 同时展示用户自己待审核的动态
    if (currentUserId) {
      where.status = undefined // 不能用简单 where
    }

    const qb = this.dynamicRepository
      .createQueryBuilder('dynamic')
      .leftJoinAndSelect('dynamic.user', 'user')
      .orderBy('dynamic.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (currentUserId) {
      qb.where('(dynamic.status = 1 OR (dynamic.status = 0 AND dynamic.userId = :uid))', { uid: currentUserId })
    } else {
      qb.where('dynamic.status = 1')
    }

    const [list, total] = await qb.getManyAndCount()

    const formattedList = await Promise.all(
      list.map(async (item) => {
        let isLiked = false
        let likeUsers: { id: number; nickname: string }[] = []

        if (item.likeCount > 0) {
          const likes = await this.dynamicLikeRepository.find({
            where: { dynamicId: item.id },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: 20,
          })

          likeUsers = likes.map((l) => ({
            id: l.userId,
            nickname: l.user?.nickname || '',
          }))

          if (currentUserId) {
            isLiked = likes.some((l) => l.userId === currentUserId)
          }
        }

        return {
          id: item.id,
          userId: item.userId,
          nickname: item.user?.nickname || '',
          avatar: item.user?.avatar || '',
          content: item.content,
          images: item.images || [],
          createdAt: item.createdAt,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          status: item.status,
          isLiked,
          likeUsers,
        }
      }),
    )

    return {
      list: formattedList,
      total,
      page,
      limit,
    }
  }

  async getDynamicDetail(dynamicId: number) {
    const dynamic = await this.dynamicRepository.findOne({
      where: { id: dynamicId },
      relations: ['user'],
    })

    if (!dynamic) throw new NotFoundException('动态不存在')

    return {
      id: dynamic.id,
      userId: dynamic.userId,
      nickname: dynamic.user?.nickname || '',
      avatar: dynamic.user?.avatar || '',
      content: dynamic.content,
      images: dynamic.images || [],
      createdAt: dynamic.createdAt,
      likeCount: dynamic.likeCount,
      commentCount: dynamic.commentCount,
    }
  }

  async createDynamic(userId: number, content: string, images: string[], totalImages: number) {
    const insertResult = await this.dynamicRepository.insert({
      userId,
      content,
      images,
      totalImages,
      likeCount: 0,
      commentCount: 0,
    } as any)

    const dynamicId = insertResult.identifiers[0]?.id
    if (!dynamicId) {
      throw new Error('动态发布失败')
    }

    return this.dynamicRepository.findOne({ where: { id: dynamicId } })
  }

  async toggleLike(dynamicId: number, userId: number) {
    const existing = await this.dynamicLikeRepository.findOne({
      where: { dynamicId, userId },
    })

    if (existing) {
      await this.dynamicLikeRepository.remove(existing)
      await this.dynamicRepository.update(
        { id: dynamicId },
        { likeCount: () => 'likeCount - 1' },
      )
      return { liked: false, action: 'unliked' }
    }

    const newLike = this.dynamicLikeRepository.create({ dynamicId, userId })
    await this.dynamicLikeRepository.save(newLike)
    await this.dynamicRepository.update(
      { id: dynamicId },
      { likeCount: () => 'likeCount + 1' },
    )
    return { liked: true, action: 'liked' }
  }

  async getLikeUsers(dynamicId: number) {
    const likes = await this.dynamicLikeRepository.find({
      where: { dynamicId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50,
    })

    return {
      likeUsers: likes.map((l) => ({
        id: l.userId,
        nickname: l.user?.nickname || '',
      })),
    }
  }

  async deleteDynamic(dynamicId: number, userId: number) {
    const dynamic = await this.dynamicRepository.findOne({ where: { id: dynamicId } })
    if (!dynamic) throw new NotFoundException('动态不存在')
    if (dynamic.userId !== userId) throw new NotFoundException('无权删除此动态')

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DynamicLike, { dynamicId })
      await manager.remove(Dynamic, dynamic)
    })
  }

  // ===== 管理后台 =====

  async getAdminDynamics(page: number, limit: number) {
    const [list, total] = await this.dynamicRepository.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const formattedList = list.map((item) => ({
      id: item.id,
      userId: item.userId,
      nickname: item.user?.nickname || '',
      content: item.content,
      images: item.images || [],
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      status: item.status,
      createdAt: item.createdAt,
    }))

    return { list: formattedList, total }
  }

  async auditDynamic(id: number, status: number) {
    const dynamic = await this.dynamicRepository.findOne({ where: { id } })
    if (!dynamic) throw new NotFoundException('动态不存在')
    await this.dynamicRepository.update(id, { status })
  }

  async deleteAdminDynamic(id: number) {
    const dynamic = await this.dynamicRepository.findOne({ where: { id } })
    if (!dynamic) throw new NotFoundException('动态不存在')
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DynamicLike, { dynamicId: id })
      await manager.remove(Dynamic, dynamic)
    })
  }
}
