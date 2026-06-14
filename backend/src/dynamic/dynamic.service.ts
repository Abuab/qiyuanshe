import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, In } from 'typeorm'
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

    if (currentUserId) {
      qb.andWhere('dynamic.userId != :currentUserId', { currentUserId })
    }

    const [list, total] = await qb.getManyAndCount()

    // simple-json 列（personalityTags/hopeTaTags）在 createQueryBuilder join 时可能
    // 不解析为数组，改用 find() + In() 单独加载用户确保类型正确
    const userIds = [...new Set(list.map((d) => d.userId).filter(Boolean))]
    const userMap = new Map<number, User>()
    if (userIds.length > 0) {
      const users = await this.userRepository.find({ where: { id: In(userIds) } })
      users.forEach((u) => userMap.set(u.id, u))
    }

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

        // 优先用 find() 加载的用户（simple-json 解析正确），回退 join 结果
        const user = userMap.get(item.userId) || item.user
        const introText = this.buildIntroFromUser(user, introTemplate, introSep)

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

    // 为有 introText 的动态在它前面插入独立的 intro 卡片
    const finalList: any[] = []
    const seenIntro = new Set<number>() // 同一用户 intro 只插一次
    for (const item of formattedList) {
      if (item.introText && !seenIntro.has(item.userId)) {
        seenIntro.add(item.userId)
        finalList.push({
          id: -item.userId,          // 负 ID 确保不冲突
          type: 'intro',
          userId: item.userId,
          nickname: item.nickname,
          avatar: item.avatar,
          isRealName: item.isRealName,
          age: item.age,
          height: item.height,
          education: item.education,
          incomeRange: item.incomeRange,
          introText: item.introText,
          content: '',
          images: [],
          questionId: undefined,
          questionTitle: undefined,
          createdAt: item.createdAt,
          likeCount: 0,
          commentCount: 0,
          isLiked: false,
          likeUsers: [],
        })
      }
      // photo/answer 卡片不带 introText
      finalList.push({ ...item, introText: '' })
    }

    return { list: finalList, total: total + seenIntro.size, page, limit }
  }

  /** 规范化标签值：兼容 simple-json 可能返回的 JSON 字符串 / 数组 / 对象 */
  private normalizeTags(raw: any): any {
    if (!raw) return null
    if (Array.isArray(raw)) return raw.length > 0 ? raw : null
    if (typeof raw === 'object') return raw
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (!trimmed) return null
      // 可能是 JSON 字符串 "[\"a\",\"b\"]" 或 "{\"character\":[\"a\"]}"
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null
          return parsed
        } catch { /* ignore, fall through */ }
      }
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean)
        return parts.length > 0 ? parts : null
      }
      return [trimmed]
    }
    return null
  }

  /** 从用户标签实时构建一句话简介 */
  private buildIntroFromUser(user: User | null, template: string, sep: string): string {
    if (!user) return ''

    const personalityTags = this.normalizeTags((user as any).personalityTags)
    const hopeTaTags = this.normalizeTags((user as any).hopeTaTags)

    let charTags: string[] = []
    let hobbyTags: string[] = []
    let ruleTags: string[] = []

    if (personalityTags) {
      if (!Array.isArray(personalityTags)) {
        // 结构化对象 {character:[...], hobby:[...], loveRule:[...]}
        charTags = Array.isArray(personalityTags.character) ? personalityTags.character : []
        hobbyTags = Array.isArray(personalityTags.hobby) ? personalityTags.hobby : []
        ruleTags = Array.isArray(personalityTags.loveRule) ? personalityTags.loveRule : []
      } else {
        charTags = personalityTags
      }
    }

    let hopeTags: string[] = []
    if (Array.isArray(hopeTaTags)) {
      hopeTags = hopeTaTags
    }

    // 全部未选 → 不显示
    if (!charTags.length && !hobbyTags.length && !ruleTags.length && !hopeTags.length) return ''

    // 构建替换映射
    const map: Record<string, string> = {
      character: charTags.length > 0 ? charTags.join(sep) : '',
      hobby: hobbyTags.length > 0 ? hobbyTags.join(sep) : '',
      loveRule: ruleTags.length > 0 ? ruleTags.join(sep) : '',
      hopeTa: hopeTags.length > 0 ? hopeTags.join(sep) : '',
    }

    // 逐个占位符替换；无值的占位符所在逗号片段整段剔除
    let result = template
    for (const [key, value] of Object.entries(map)) {
      if (value) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
      } else {
        result = result.replace(new RegExp(`，?[^，]*?\\{${key}\\}[^，]*，?`, 'g'), '')
      }
    }

    return result
      .replace(/，+/g, '，')
      .replace(/^，+/, '')
      .replace(/，+$/, '')
      .trim()
  }

  /** 自动生成动态（照片更新 / 问答回答），status=1 跳过审核 */
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
