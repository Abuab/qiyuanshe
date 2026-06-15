import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { MatchRecord } from '../entities/MatchRecord'
import { Matchmaker } from '../entities/Matchmaker'
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
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepository: Repository<Matchmaker>,
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
    // 红娘动态：从 match_records 表查询
    if (type === 'matchmaker') {
      return this.getMatchmakerDynamics(page, limit, currentUserId)
    }

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

    // 用 raw SQL 直接读取标签列，绕过 TypeORM simple-json 解析问题
    const userIds = [...new Set(list.map((d) => d.userId).filter(Boolean))]
    const tagMap = new Map<number, { personalityTags: any; hopeTaTags: any }>()
    if (userIds.length > 0) {
      const rows: any[] = await this.dataSource.query(
        `SELECT id, personalityTags, hopeTaTags FROM users WHERE id IN (${userIds.join(',')})`,
      )
      for (const row of rows) {
        tagMap.set(row.id, {
          personalityTags: this.parseJsonField(row.personalityTags),
          hopeTaTags: this.parseJsonField(row.hopeTaTags),
        })
      }
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

        // 用 raw SQL 加载的标签构建简介
        const tags = tagMap.get(item.userId)
        const introText = tags
          ? this.buildIntroFromTags(tags.personalityTags, tags.hopeTaTags, introTemplate, introSep)
          : ''

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

  /** 获取红娘动态列表（从 match_records 查询） */
  private async getMatchmakerDynamics(
    page: number,
    limit: number,
    currentUserId?: number,
  ) {
    const qb = this.matchRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.matchmaker', 'matchmaker')
      .leftJoinAndSelect('record.matchedUser', 'matchedUser')
      .where('record.status != :failed', { failed: 'failed' })
      .orderBy('record.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (currentUserId) {
      qb.andWhere('record.userId != :currentUserId', { currentUserId })
    }

    const [records, total] = await qb.getManyAndCount()

    const list = records.map((r) => ({
      id: r.id,
      type: 'matchmaker',
      userId: r.userId,
      nickname: r.matchedUser?.nickname || '',
      avatar: r.matchedUser?.avatar || '',
      isRealName: r.matchedUser?.isRealName || 0,
      age: r.matchedUser?.age || 0,
      height: r.matchedUser?.height || 0,
      education: r.matchedUser?.education || '',
      incomeRange: r.matchedUser?.incomeRange || '',
      occupation: r.matchedUser?.occupation || '',
      introText: '',
      content: r.remark || '',
      images: [],
      questionId: undefined,
      questionTitle: undefined,
      createdAt: r.createdAt,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      likeUsers: [],
      // 红娘信息
      matchmakerId: r.matchmaker?.id || 0,
      matchmakerName: r.matchmaker?.name || '',
      matchmakerAvatar: r.matchmaker?.avatar || '',
      matchmakerTitle: r.matchmaker?.title || '',
      matchmakerPhone: r.matchmaker?.phone || '',
      matchmakerWechat: r.matchmaker?.wechat || '',
    }))

    return { list, total, page, limit }
  }

  /** 从 MySQL raw 字段解析 JSON（兼容字符串/已解析对象） */
  private parseJsonField(value: any): any {
    if (value === null || value === undefined) return null
    if (typeof value === 'object') return value
    if (typeof value === 'string') {
      try { return JSON.parse(value) } catch { return null }
    }
    return null
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

  /** 从已解析的标签实时构建一句话简介 */
  private buildIntroFromTags(
    rawPersonality: any,
    rawHopeTa: any,
    template: string,
    sep: string,
  ): string {
    const personalityTags = this.normalizeTags(rawPersonality)
    const hopeTaTags = this.normalizeTags(rawHopeTa)

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
