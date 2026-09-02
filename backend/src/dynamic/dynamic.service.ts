import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Dynamic } from '../entities/Dynamic'
import { MatchRecord } from '../entities/MatchRecord'
import { Matchmaker } from '../entities/Matchmaker'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { Follow } from '../entities/Follow'
import { SystemService } from '../system/system.service'
import { LicenseService } from '../license/license.service'
import { DynamicType } from '../shared/enums'
import { resolveAvatarUrl } from '../common/image-url'

@Injectable()
export class DynamicService {
  constructor(
    @InjectRepository(Dynamic)
    private readonly dynamicRepository: Repository<Dynamic>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly userPhotoRepository: Repository<UserPhoto>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepository: Repository<Matchmaker>,
    private readonly systemService: SystemService,
    private readonly dataSource: DataSource,
    private readonly licenseService: LicenseService,
  ) {}

  /** 获取动态列表（支持按类型和性别过滤） */
  async getDynamics(
    page: number,
    limit: number,
    currentUserId?: number,
    type?: string,
    gender?: number,
  ) {
    // 红娘动态：从 match_records 表查询
    if (type === DynamicType.MATCHMAKER) {
      return this.getMatchmakerDynamics(page, limit, currentUserId, gender)
    }

    // 并行查询两个数据源：用户卡片 + 问答动态
    const fetchLimit = page * limit
    const [userResult, answerResult] = await Promise.all([
      this.getUserDynamics(1, fetchLimit, currentUserId, type, gender),
      this.getAnswerDynamics(1, fetchLimit, currentUserId, type, gender),
    ])

    // 合并并按时间排序
    const merged = [...userResult.list, ...answerResult.list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const offset = (page - 1) * limit
    const sliced = merged.slice(offset, offset + limit)
    const total = userResult.total + answerResult.total

    return { list: sliced, total, page, limit }
  }

  /** 从 users 表直接读取用户动态（含照片、简介） */
  private async getUserDynamics(
    page: number,
    limit: number,
    currentUserId?: number,
    type?: string,
    gender?: number,
  ) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 1 })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })
      .andWhere('user.id != :adminId', { adminId: 1 })
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (currentUserId) {
      qb.andWhere('user.id != :currentUserId', { currentUserId })
    }

    // 性别过滤：只展示异性动态
    if (gender) {
      qb.andWhere('user.gender = :gender', { gender })
    }

    // "关注" tab：只显示当前用户关注的人
    if (type === 'follow') {
      if (currentUserId) {
        const follows = await this.followRepository.find({
          where: { userId: currentUserId },
          select: ['targetUserId'],
        })
        const fIds = follows.map((f) => f.targetUserId)
        if (fIds.length === 0) {
          return { list: [], total: 0, page, limit }
        }
        qb.andWhere('user.id IN (:...fIds)', { fIds })
      } else {
        return { list: [], total: 0, page, limit }
      }
    }

    const [users, total] = await qb.getManyAndCount()

    if (users.length === 0) {
      return { list: [], total, page, limit }
    }

    const userIds = users.map((u) => u.id)

    // 读取简介模板配置
    const rawTemplate = await this.systemService.getConfig('intro.template')
    const introTemplate = rawTemplate || '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}'
    const introSep = (await this.systemService.getConfig('intro.separator')) || '、'

    // 批量读取每个用户的前 4 张照片
    const allPhotos = await this.userPhotoRepository
      .createQueryBuilder('photo')
      .where('photo.userId IN (:...userIds)', { userIds })
      .orderBy('photo.sortOrder', 'ASC')
      .getMany()

    const photosMap = new Map<number, string[]>()
    for (const p of allPhotos) {
      const arr = photosMap.get(p.userId) || []
      if (arr.length < 4) {
        const url = p.photoUrl || ''
        arr.push(url.startsWith('http') ? url : url.startsWith('/') ? url : '/' + url)
      }
      photosMap.set(p.userId, arr)
    }

    const list = users.map((user) => {
      const personalityTags = this.parseJsonField(user.personalityTags)
      const hopeTaTags = this.parseJsonField(user.hopeTaTags)
      const introText = (personalityTags || hopeTaTags)
        ? this.buildIntroFromTags(personalityTags, hopeTaTags, introTemplate, introSep)
        : ''

      const images = photosMap.get(user.id) || []

      return {
        id: user.id,
        type: 'photo',
        userId: user.id,
        nickname: user.nickname || '',
        avatar: resolveAvatarUrl(user.avatar) || '',
        isRealName: user.isRealName || 0,
        age: user.age || 0,
        height: user.height || 0,
        education: user.education || '',
        incomeRange: user.incomeRange || '',
        introText,
        content: '',
        images,
        questionId: undefined as number | undefined,
        questionTitle: undefined as string | undefined,
        createdAt: user.createdAt,
        commentCount: 0,
      }
    })

    return { list, total, page, limit }
  }

  /** 从 dynamics 表查询 answer 类型的问答动态 */
  private async getAnswerDynamics(
    page: number,
    limit: number,
    currentUserId?: number,
    type?: string,
    gender?: number,
  ) {
    const qb = this.dynamicRepository
      .createQueryBuilder('dynamic')
      .leftJoinAndSelect('dynamic.user', 'user')
      .where("dynamic.type = 'answer'")
      .andWhere('user.status = :status', { status: 1 })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: 0 })
      .orderBy('dynamic.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (currentUserId) {
      qb.andWhere('dynamic.userId != :currentUserId', { currentUserId })
    }

    // 性别过滤：只展示异性动态
    if (gender) {
      qb.andWhere('user.gender = :gender', { gender })
    }

    // "关注" tab：只显示当前用户关注的人的问答
    if (type === 'follow') {
      if (currentUserId) {
        const follows = await this.followRepository.find({
          where: { userId: currentUserId },
          select: ['targetUserId'],
        })
        const fIds = follows.map((f) => f.targetUserId)
        if (fIds.length === 0) {
          return { list: [], total: 0, page, limit }
        }
        qb.andWhere('dynamic.userId IN (:...fIds)', { fIds })
      } else {
        return { list: [], total: 0, page, limit }
      }
    }

    const [list, total] = await qb.getManyAndCount()

    // 读取简介模板配置
    const rawTemplate = await this.systemService.getConfig('intro.template')
    const introTemplate = rawTemplate || '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}'
    const introSep = (await this.systemService.getConfig('intro.separator')) || '、'

    // 批量读取标签构建简介
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

    const formattedList = list.map((item) => {
      const tags = tagMap.get(item.userId)
      const introText = tags
        ? this.buildIntroFromTags(tags.personalityTags, tags.hopeTaTags, introTemplate, introSep)
        : ''

      return {
        id: item.id,
        type: 'answer',
        userId: item.userId,
        nickname: item.user?.nickname || '',
        avatar: resolveAvatarUrl(item.user?.avatar) || '',
        isRealName: item.user?.isRealName || 0,
        age: item.user?.age || 0,
        height: item.user?.height || 0,
        education: item.user?.education || '',
        incomeRange: item.user?.incomeRange || '',
        introText,
        content: item.content,
        images: [],
        questionId: item.questionId,
        questionTitle: item.questionTitle,
        createdAt: item.createdAt,
        commentCount: item.commentCount,
      }
    })

    return { list: formattedList, total, page, limit }
  }

  /** 获取红娘动态列表（从 match_records 查询）
   *  - 红娘推荐了用户（matchedUserId 非空）：按查看者异性过滤
   *  - 红娘纯文案动态（matchedUserId 为空）：全用户可见 */
  private async getMatchmakerDynamics(
    page: number,
    limit: number,
    _currentUserId?: number,
    gender?: number,
  ) {
    const qb = this.matchRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.matchmaker', 'matchmaker')
      .leftJoinAndSelect('record.matchedUser', 'matchedUser')
      .where('record.status != :failed', { failed: 'failed' })
      .orderBy('record.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    // 性别过滤：仅对推荐了用户的记录生效（纯文案不区分性别）
    if (gender) {
      qb.andWhere(
        '(record.matchedUserId IS NULL OR matchedUser.gender = :gender)',
        { gender },
      )
    }

    const [records, total] = await qb.getManyAndCount()

    const list = records.map((r) => ({
      id: r.id,
      type: 'matchmaker',
      userId: r.userId,
      nickname: r.matchedUser?.nickname || '',
      avatar: resolveAvatarUrl(r.matchedUser?.avatar) || '',
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
      commentCount: 0,
      // 红娘信息
      matchmakerId: r.matchmaker?.id || 0,
      matchmakerName: r.matchmaker?.name || '',
      matchmakerAvatar: resolveAvatarUrl(r.matchmaker?.avatar) || '',
      matchmakerTitle: r.matchmaker?.title || '',
      matchmakerPhone: r.matchmaker?.phone || '',
      matchmakerWechat: r.matchmaker?.wechat || '',
      matchmakerQrCode: r.matchmaker?.qrCode || '',
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

  /** 自动生成动态（问答回答），status=1 跳过审核 */
  async autoCreateDynamic(params: {
    userId: number
    type: 'answer'
    content?: string
    images?: string[]
    referenceId?: number
    questionId?: number
    questionTitle?: string
  }): Promise<Dynamic | null> {
    if (!(await this.licenseService.isActive())) {
      throw new ForbiddenException('系统未授权，该功能暂不可用')
    }

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
      commentCount: 0,
    } as any)

    const dynamicId = insertResult.identifiers[0]?.id
    if (!dynamicId) return null
    return this.dynamicRepository.findOne({ where: { id: dynamicId } })
  }
}
