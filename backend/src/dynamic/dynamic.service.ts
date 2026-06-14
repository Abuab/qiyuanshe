import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { HotQuestion } from '../entities/HotQuestion'
import { SystemService } from '../system/system.service'

@Injectable()
export class DynamicService implements OnModuleInit {
  private readonly logger = new Logger(DynamicService.name)

  constructor(
    @InjectRepository(Dynamic)
    private readonly dynamicRepository: Repository<Dynamic>,
    @InjectRepository(DynamicLike)
    private readonly dynamicLikeRepository: Repository<DynamicLike>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepository: Repository<QuestionAnswer>,
    @InjectRepository(HotQuestion)
    private readonly questionRepository: Repository<HotQuestion>,
    private readonly systemService: SystemService,
    private readonly dataSource: DataSource,
  ) {}

  /** 启动时自动为已有数据生成动态（仅执行一次） */
  async onModuleInit() {
    // 延迟执行，等待数据库连接就绪
    setTimeout(async () => {
      try {
        await this.seedExistingDynamics()
      } catch (e: any) {
        this.logger.warn(`[Dynamic] 种子数据生成失败: ${e?.message}`)
      }
    }, 5000)
  }

  /** 扫描所有用户已有照片和问答，生成对应动态（每次启动都执行，per-record 去重） */
  private async seedExistingDynamics() {
    this.logger.log('[Dynamic] 扫描已有数据...')

    // 1. 每个有标签的用户生成一条「个人简介」动态
    const users = await this.userRepository.find({ where: { isDeleted: 0 } })
    for (const user of users) {
      const exists = await this.dynamicRepository.findOne({
        where: { userId: user.id, type: 'intro' },
      })
      if (exists) continue

      const personalityTags = (user as any).personalityTags
      const hopeTaTags = (user as any).hopeTaTags
      const hasPersonality = personalityTags && (
        (Array.isArray(personalityTags) && personalityTags.length > 0) ||
        (typeof personalityTags === 'object' && !Array.isArray(personalityTags) &&
          (Array.isArray(personalityTags.character) || Array.isArray(personalityTags.hobby) || Array.isArray(personalityTags.loveRule)))
      )
      const hasHopeTa = hopeTaTags && (
        (Array.isArray(hopeTaTags) && hopeTaTags.length > 0) ||
        (typeof hopeTaTags === 'string' && hopeTaTags.trim().length > 0)
      )
      if (!hasPersonality && !hasHopeTa) continue

      await this.dynamicRepository.insert({
        userId: user.id,
        type: 'intro',
        content: null,
        images: [],
        status: 1,
        likeCount: 0,
        commentCount: 0,
      } as any)
    }

    // 2. 照片动态：每个有照片的用户生成一条（最多3张）
    const photos = await this.userPhotoRepository
      .createQueryBuilder('photo')
      .select('DISTINCT photo.userId', 'userId')
      .getRawMany<{ userId: number }>()

    for (const { userId } of photos) {
      const exists = await this.dynamicRepository.findOne({
        where: { userId, type: 'photo' },
      })
      if (exists) continue

      const userPhotos = await this.userPhotoRepository.find({
        where: { userId },
        order: { sortOrder: 'ASC' },
        take: 3,
      })
      if (userPhotos.length === 0) continue

      await this.dynamicRepository.insert({
        userId,
        type: 'photo',
        content: '更新了相册',
        images: userPhotos.map((p) => p.photoUrl),
        totalImages: userPhotos.length,
        status: 1,
        likeCount: 0,
        commentCount: 0,
      } as any)
    }

    // 3. 问答动态
    const answers = await this.answerRepository.find({ relations: ['question'] })
    for (const answer of answers) {
      const exists = await this.dynamicRepository.findOne({
        where: { userId: answer.userId, type: 'answer', referenceId: answer.id },
      })
      if (exists) continue

      await this.dynamicRepository.insert({
        userId: answer.userId,
        type: 'answer',
        content: answer.content,
        images: answer.photos || [],
        totalImages: (answer.photos || []).length,
        referenceId: answer.id,
        questionId: answer.questionId,
        questionTitle: answer.question?.title || '',
        status: 1,
        likeCount: 0,
        commentCount: 0,
      } as any)
    }

    this.logger.log('[Dynamic] 扫描完成')
  }

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
      .where("dynamic.type IN ('intro', 'photo', 'answer')")
      .orderBy('dynamic.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (type && type !== 'all') {
      qb.andWhere('dynamic.type = :type', { type })
    }

    if (followUserIds && followUserIds.length > 0) {
      qb.andWhere('dynamic.userId IN (:...followUserIds)', { followUserIds })
    }

    if (currentUserId) {
      qb.andWhere('dynamic.userId != :currentUserId', { currentUserId })
    }

    const [list, total] = await qb.getManyAndCount()

    // 读取简介模板配置
    const rawTemplate = await this.systemService.getConfig('intro.template')
    const introTemplate = rawTemplate || '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}'
    const introSep = (await this.systemService.getConfig('intro.separator')) || '、'

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

        // 构建用户一句话简介：只包含用户实际选中的标签
        const introText = this.buildIntroFromUser(item.user, introTemplate, introSep)

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

  /** 从用户标签构建一句话简介 */
  private buildIntroFromUser(user: User | null, template: string, sep: string): string {
    if (!user) return ''

    const personalityTags = (user as any).personalityTags
    const hopeTaTags = (user as any).hopeTaTags

    let charTags: string[] = []
    let hobbyTags: string[] = []
    let ruleTags: string[] = []

    if (personalityTags) {
      if (typeof personalityTags === 'object' && !Array.isArray(personalityTags)) {
        charTags = Array.isArray(personalityTags.character) ? personalityTags.character : []
        hobbyTags = Array.isArray(personalityTags.hobby) ? personalityTags.hobby : []
        ruleTags  = Array.isArray(personalityTags.loveRule) ? personalityTags.loveRule : []
      } else if (Array.isArray(personalityTags)) {
        charTags = personalityTags
      } else if (typeof personalityTags === 'string' && personalityTags.length > 0) {
        charTags = personalityTags.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    }

    let hopeTags: string[] = []
    if (hopeTaTags) {
      if (Array.isArray(hopeTaTags)) {
        hopeTags = hopeTaTags
      } else if (typeof hopeTaTags === 'string' && hopeTaTags.length > 0) {
        hopeTags = hopeTaTags.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    }

    // 全部未选 → 不展示
    if (!charTags.length && !hobbyTags.length && !ruleTags.length && !hopeTags.length) return ''

    // 构建替换映射（空数组 → 空字符串）
    const map: Record<string, string> = {
      character: charTags.length > 0 ? charTags.join(sep) : '',
      hobby: hobbyTags.length > 0 ? hobbyTags.join(sep) : '',
      loveRule: ruleTags.length > 0 ? ruleTags.join(sep) : '',
      hopeTa: hopeTags.length > 0 ? hopeTags.join(sep) : '',
    }

    // 逐个占位符：有值则替换，无值则剔除该占位符所在的逗号分隔句子片段
    let result = template
    for (const [key, value] of Object.entries(map)) {
      if (value) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
      } else {
        // 删除包含此占位符的整个逗号片段（含前后逗号）
        result = result.replace(new RegExp(`，?[^，]*?\\{${key}\\}[^，]*，?`, 'g'), '')
      }
    }

    // 最终清理
    result = result
      .replace(/，+/g, '，')
      .replace(/^，+/, '')
      .replace(/，+$/, '')
      .trim()

    return result
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
