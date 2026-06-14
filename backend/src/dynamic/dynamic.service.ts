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

  /** 扫描所有用户已有照片和问答，生成对应动态 */
  private async seedExistingDynamics() {
    const key = 'system.dynamic_seeded'
    const seeded = await this.systemService.getConfig(key)
    if (seeded === '1') return

    this.logger.log('[Dynamic] 开始为已有数据生成动态...')

    // 1. 照片动态：每个有照片的用户生成一条
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

    // 2. 问答动态
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

    await this.systemService.saveConfigs({
      system: { dynamic_seeded: '1' },
    })
    this.logger.log('[Dynamic] 种子数据生成完成')
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
      .where("dynamic.type IN ('photo', 'answer')")
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

    // 提取标签值（personalityTags 是平铺数组，无法区分 character/hobby/loveRule）
    let charTags: string[] = []
    let hobbyTags: string[] = []
    let ruleTags: string[] = []

    if (personalityTags) {
      if (typeof personalityTags === 'object' && !Array.isArray(personalityTags)) {
        // 结构化：{character:[...], hobby:[...], loveRule:[...]}
        charTags = Array.isArray(personalityTags.character) ? personalityTags.character : []
        hobbyTags = Array.isArray(personalityTags.hobby) ? personalityTags.hobby : []
        ruleTags  = Array.isArray(personalityTags.loveRule) ? personalityTags.loveRule : []
      } else if (Array.isArray(personalityTags)) {
        // 平铺数组：全部放进 character
        charTags = personalityTags
      } else if (typeof personalityTags === 'string' && personalityTags.length > 0) {
        // 逗号字符串
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

    // 构建替换映射
    const vals: Record<string, string> = {
      character: charTags.length > 0 ? charTags.join(sep) : '',
      hobby: hobbyTags.length > 0 ? hobbyTags.join(sep) : '',
      loveRule: ruleTags.length > 0 ? ruleTags.join(sep) : '',
      hopeTa: hopeTags.length > 0 ? hopeTags.join(sep) : '',
    }

    // 如果所有标签都为空，返回空字符串（不显示简介行）
    const hasAny = Object.values(vals).some((v) => v.length > 0)
    if (!hasAny) return ''

    // 替换模板变量，空的类别直接去掉该段
    let result = template
      .replace(/\{(\w+)\}/g, (_: string, key: string) => vals[key] || '')

    // 清理残留的标点和多余空格
    result = result
      .replace(/，+/g, '，')
      .replace(/^[，,\s]+/, '')
      .replace(/[，,\s]+$/, '')
      .replace(/，(\s*)/g, '，')
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
