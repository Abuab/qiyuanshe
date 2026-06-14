import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { User } from '../entities/User'
import { SystemService } from '../system/system.service'

@Injectable()
export class DynamicService {
  constructor(
    @InjectRepository(Dynamic)
    private readonly dynamicRepository: Repository<Dynamic>,
    @InjectRepository(DynamicLike)
    private readonly dynamicLikeRepository: Repository<DynamicLike>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly systemService: SystemService,
    private readonly dataSource: DataSource,
  ) {}

  /** 获取动态列表（支持按类型过滤） */
  async getDynamics(
    page: number,
    limit: number,
    currentUserId?: number,
    type?: string,
    followUserIds?: number[],
  ) {
    const qb = this.dynamicRepository
      .createQueryBuilder('dynamic')
      .leftJoinAndSelect('dynamic.user', 'user')
      .where('dynamic.status IN (0, 1)')
      .andWhere("dynamic.type != 'text'")
      .orderBy('dynamic.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (type && type !== 'all') {
      qb.andWhere('dynamic.type = :type', { type })
    }

    if (followUserIds && followUserIds.length > 0) {
      qb.andWhere('dynamic.userId IN (:...followUserIds)', { followUserIds })
    }

    const [list, total] = await qb.getManyAndCount()

    // 读取简介模板配置（一次性，不用每条都查）
    const rawTemplate = await this.systemService.getConfig('intro.template')
    const introTemplate = rawTemplate || '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}'
    const introSep = (await this.systemService.getConfig('intro.separator')) || '、'
    const introEmpty = (await this.systemService.getConfig('intro.emptyPlaceholder')) || '（暂未填写）'

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

        // 构建用户一句话简介
        const pt = (item.user as any)?.personalityTags
        const ht = (item.user as any)?.hopeTaTags
        const vals: Record<string, string[]> = { character: [], hobby: [], loveRule: [], hopeTa: [] }
        if (pt && typeof pt === 'object' && !Array.isArray(pt)) {
          if (Array.isArray(pt.character)) vals.character = pt.character
          if (Array.isArray(pt.hobby)) vals.hobby = pt.hobby
          if (Array.isArray(pt.loveRule)) vals.loveRule = pt.loveRule
        } else if (Array.isArray(pt)) {
          vals.character = pt
        }
        if (Array.isArray(ht)) vals.hopeTa = ht
        const introText = introTemplate.replace(/\{(\w+)\}/g, (_: string, key: string) => {
          const tags = vals[key]
          return tags && tags.length > 0 ? tags.join(introSep) : introEmpty
        })

        return {
          id: item.id,
          type: item.type,
          userId: item.userId,
          nickname: item.user?.nickname || '',
          avatar: item.user?.avatar || '',
          isRealName: item.user?.isRealName || 0,
          age: item.user?.age || 0,
          height: item.user?.height || 0,
          education: item.user?.education || '',
          incomeRange: item.user?.incomeRange || '',
          introText,
          content: item.content,
          images: item.images || [],
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          createdAt: item.createdAt,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          isLiked,
          likeUsers,
        }
      }),
    )

    return { list: formattedList, total, page, limit }
  }

  /** 自动生成动态（照片更新 + 问答回答），status=1 跳过审核 */
  async autoCreateDynamic(params: {
    userId: number
    type: 'photo' | 'answer'
    content?: string
    images?: string[]
    referenceId?: number
    questionId?: number
    questionTitle?: string
  }): Promise<Dynamic | null> {
    const insertResult = await this.dynamicRepository.insert({
      userId: params.userId,
      type: params.type,
      content: params.content || null,
      images: params.images || [],
      totalImages: params.images?.length || 0,
      referenceId: params.referenceId || null,
      questionId: params.questionId || null,
      questionTitle: params.questionTitle || null,
      status: 1,
      likeCount: 0,
      commentCount: 0,
    } as any)

    const dynamicId = insertResult.identifiers[0]?.id
    if (!dynamicId) return null
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
}
