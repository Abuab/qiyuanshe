import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, DataSource } from 'typeorm'
import { randomBytes } from 'crypto'
import { RedisService } from '../common/redis.service'
import { PersonalityDimension } from './entities/PersonalityDimension'
import { PersonalityQuestion } from './entities/PersonalityQuestion'
import { PersonalityOption } from './entities/PersonalityOption'
import { PersonalityType } from './entities/PersonalityType'
import { PersonalityAnswerRecord } from './entities/PersonalityAnswerRecord'
import { PersonalityResult } from './entities/PersonalityResult'
import { PersonalityConfigService } from './personality-config.service'
import { PersonalityGuestService } from './personality-guest.service'
import {
  computePersonalityResult,
  shuffle,
  ScoringDimension,
  ScoringAnswer,
} from './personality-scoring'
import { PersonalityResultView, PersonalitySimpleView } from './personality.types'
import { shanghaiDayKey, secondsUntilShanghaiMidnight } from './personality-time.util'

interface SubmitAnswerInput {
  questionId: number
  optionId: number
  answeredAt?: number
}

interface SubmitInput {
  sessionId?: string
  guestToken?: string
  answers: SubmitAnswerInput[]
  startedAt?: number
}

interface QuizSession {
  issuedAt: number
  questionIds: number[]
  subject: string
}

/**
 * 人格测试 - 小程序端核心服务（取题 / 提交计算 / 结果 / 重测 / 迁移 / 他人结果）
 *
 * 登录用户结果写入 MySQL；游客结果暂存 Redis。
 */
@Injectable()
export class PersonalityUserService {
  private static readonly SESSION_PREFIX = 'ptest:session'
  private static readonly SESSION_TTL = 3600
  static readonly STAT_PREFIX = 'ptest:stat'

  constructor(
    @InjectRepository(PersonalityDimension)
    private readonly dimensionRepo: Repository<PersonalityDimension>,
    @InjectRepository(PersonalityQuestion)
    private readonly questionRepo: Repository<PersonalityQuestion>,
    @InjectRepository(PersonalityOption)
    private readonly optionRepo: Repository<PersonalityOption>,
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
    @InjectRepository(PersonalityResult)
    private readonly resultRepo: Repository<PersonalityResult>,
    private readonly redis: RedisService,
    private readonly configService: PersonalityConfigService,
    private readonly guestService: PersonalityGuestService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== 取题 ====================

  /**
   * 获取题目列表：随机抽取 N 道启用题目（保证覆盖各维度），题目顺序与选项顺序均随机打乱。
   * 返回的选项仅含 optionId + 文本，不暴露方向/分值，防止脚本据此固定作答。
   */
  async getQuestions(subject: { userId?: number; guestToken?: string }): Promise<any> {
    const cfg = await this.configService.getConfig()

    // 游客需持有效 token
    if (!subject.userId) {
      if (!subject.guestToken || !(await this.guestService.isValidToken(subject.guestToken))) {
        throw new BadRequestException('游客身份无效或已过期，请重新进入')
      }
    }

    const dimensions = await this.loadDimensions()
    const dimIdSet = new Set(dimensions.map((d) => d.id))

    // 仅取「启用 + 未删除 + 恰好两个选项」的题目
    const questions = await this.questionRepo.find({
      where: { isEnabled: 1, isDeleted: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const validQuestions = questions.filter((q) => dimIdSet.has(q.dimensionId))

    const questionIds = validQuestions.map((q) => q.id)
    const optionMap = await this.loadOptionsByQuestionIds(questionIds)

    // 过滤出恰好两个选项的题目
    const answerable = validQuestions.filter((q) => (optionMap.get(q.id)?.length || 0) === 2)
    // 题库未配置时，返回空题目而非抛错（前端展示空态即可，避免控制台 400）
    if (answerable.length === 0) {
      return {
        sessionId: '',
        minDurationSeconds: cfg.minDurationSeconds,
        total: 0,
        remainingAttempts: await this.remainingAttempts(subject, cfg),
        questions: [],
      }
    }

    const selected = this.selectQuestions(answerable, cfg.questionCount)

    // 组装返回（打乱选项顺序）
    const dimById = new Map(dimensions.map((d) => [d.id, d]))
    const payload = selected.map((q) => {
      const opts = shuffle(optionMap.get(q.id) || [])
      const dim = dimById.get(q.dimensionId)
      return {
        questionId: q.id,
        dimensionCode: dim?.code || '',
        dimensionName: dim?.name || '',
        content: q.content,
        options: opts.map((o) => ({ optionId: o.id, content: o.content })),
      }
    })

    // 创建服务端会话，用于答题时长与作答合法性校验
    const sessionId = await this.createSession(
      selected.map((q) => q.id),
      subject.userId ? `user:${subject.userId}` : `guest:${subject.guestToken}`,
    )

    const remainingAttempts = await this.remainingAttempts(subject, cfg)

    // 开始答题计数（含游客+注册，含重测），用于完成率统计
    this.bumpStat('started')

    return {
      sessionId,
      minDurationSeconds: cfg.minDurationSeconds,
      total: payload.length,
      remainingAttempts,
      questions: payload,
    }
  }

  // ==================== 提交作答 ====================

  async submit(input: SubmitInput, subject: { userId?: number; guestToken?: string }): Promise<PersonalityResultView> {
    const cfg = await this.configService.getConfig()
    const answers = Array.isArray(input.answers) ? input.answers : []
    if (answers.length === 0) {
      throw new BadRequestException('作答不能为空')
    }

    // 游客校验 token + 每日次数
    if (!subject.userId) {
      if (!subject.guestToken || !(await this.guestService.isValidToken(subject.guestToken))) {
        throw new BadRequestException('游客身份无效或已过期，请重新进入')
      }
      const used = await this.guestService.getDailyCount(subject.guestToken)
      if (used >= cfg.guestDailyLimit) {
        throw new HttpException('今日测试次数已用完，登录后可无限测试', HttpStatus.TOO_MANY_REQUESTS)
      }
    }

    // 答题时长校验（服务端会话为准，回退到客户端首末题时间差）
    await this.assertDuration(input, answers, cfg.minDurationSeconds)

    // 从 DB 加载题目/选项（权威数据，不信任客户端方向/分值）
    const questionIds = [...new Set(answers.map((a) => Number(a.questionId)).filter(Boolean))]
    const optionIds = [...new Set(answers.map((a) => Number(a.optionId)).filter(Boolean))]
    if (questionIds.length === 0 || optionIds.length === 0) {
      throw new BadRequestException('作答数据不合法')
    }

    const dimensions = await this.loadDimensions()
    const dimById = new Map(dimensions.map((d) => [d.id, d]))
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds), isEnabled: 1, isDeleted: 0 },
    })
    const options = await this.optionRepo.find({ where: { id: In(optionIds) } })

    const scoringQuestions = questions.map((q) => ({
      questionId: q.id,
      dimensionId: q.dimensionId,
      dimensionCode: dimById.get(q.dimensionId)?.code || '',
    }))
    const scoringOptions = options.map((o) => ({
      optionId: o.id,
      questionId: o.questionId,
      directionKey: o.directionKey,
      score: o.score,
    }))
    const scoringAnswers: ScoringAnswer[] = answers.map((a) => ({
      questionId: Number(a.questionId),
      optionId: Number(a.optionId),
    }))

    const scoring = computePersonalityResult(scoringAnswers, scoringQuestions, scoringOptions, dimensions)

    const type = await this.typeRepo.findOne({
      where: { code: scoring.typeCode, isDeleted: 0 },
    })

    const testedAt = new Date()
    const durationSeconds = input.startedAt
      ? Math.max(0, Math.round((Date.now() - input.startedAt) / 1000))
      : null
    const view: PersonalityResultView = {
      typeCode: scoring.typeCode,
      typeName: type?.name ?? null,
      nickname: type?.nickname ?? null,
      summary: type?.summary ?? null,
      description: type?.description ?? null,
      radar: scoring.radar,
      dimensions: scoring.dimensions,
      matchTypes: type?.matchTypes ?? [],
      testedAt: testedAt.toISOString(),
      isGuest: !subject.userId,
    }

    if (subject.userId) {
      // 登录用户：重测次数限制 + 覆盖写入 MySQL
      await this.persistUserResult(subject.userId, scoringAnswers, scoring, type, testedAt, cfg, durationSeconds)
    } else {
      // 游客：完整结果暂存 Redis（供登录后迁移），每日次数递增
      await this.guestService.saveResult(subject.guestToken!, view)
      await this.guestService.incrDailyCount(subject.guestToken!)
      this.bumpStat('guest_total')
      this.bumpGuestDaily()
    }
    // 完成计数（含游客+注册），用于完成率统计
    this.bumpStat('completed')

    // 会话用后即焚，并清空暂存的答题进度
    if (input.sessionId) {
      await this.redis.del(this.sessionKey(input.sessionId))
    }
    await this.clearProgress(subject)

    // 游客仅展示简化版结果，完整解析需登录后查看
    return subject.userId ? view : this.toGuestSimplified(view)
  }

  // ==================== 答题进度暂存（断点续答） ====================

  /**
   * 暂存答题进度（游客/登录用户均支持，均存 Redis，不落 MySQL）。
   */
  async saveProgress(
    subject: { userId?: number; guestToken?: string },
    payload: { sessionId?: string; answers?: SubmitAnswerInput[] },
  ): Promise<void> {
    const cfg = await this.configService.getConfig()
    let ttl = 24 * 3600
    if (!subject.userId) {
      if (!subject.guestToken || !(await this.guestService.isValidToken(subject.guestToken))) {
        throw new BadRequestException('游客身份无效或已过期，请重新进入')
      }
      ttl = cfg.guestTokenTtlHours * 3600
    }
    const data = {
      sessionId: payload.sessionId ?? null,
      answers: Array.isArray(payload.answers) ? payload.answers : [],
      updatedAt: Date.now(),
    }
    await this.redis.set(this.progressKey(subject), JSON.stringify(data), ttl)
  }

  /** 读取暂存的答题进度 */
  async getProgress(subject: { userId?: number; guestToken?: string }): Promise<any | null> {
    if (!subject.userId && !subject.guestToken) return null
    const raw = await this.redis.get(this.progressKey(subject))
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private async clearProgress(subject: { userId?: number; guestToken?: string }): Promise<void> {
    if (!subject.userId && !subject.guestToken) return
    await this.redis.del(this.progressKey(subject))
  }

  private progressKey(subject: { userId?: number; guestToken?: string }): string {
    return subject.userId
      ? `ptest:progress:user:${subject.userId}`
      : `ptest:progress:guest:${subject.guestToken}`
  }

  // ==================== 我的结果 ====================

  async getMyResult(subject: { userId?: number; guestToken?: string }): Promise<PersonalityResultView | null> {
    if (subject.userId) {
      const result = await this.resultRepo.findOne({
        where: { userId: subject.userId, isDeleted: 0 },
      })
      if (!result) return null
      return this.resultEntityToView(result, false)
    }
    if (subject.guestToken) {
      const full = await this.guestService.getResult(subject.guestToken)
      return full ? this.toGuestSimplified(full) : null
    }
    return null
  }

  // ==================== 重新测试 ====================

  /**
   * 重新测试：登录用户校验每日重测次数上限；游客清空 Redis 结果。返回新题目。
   * 说明：不在此处递增重测计数，实际计数在 submit 覆盖旧结果时进行，避免中途放弃被误计。
   */
  async retest(subject: { userId?: number; guestToken?: string }): Promise<any> {
    const cfg = await this.configService.getConfig()

    if (subject.userId) {
      const existing = await this.resultRepo.findOne({
        where: { userId: subject.userId, isDeleted: 0 },
      })
      if (existing) {
        const used = await this.getRetestCount(subject.userId)
        if (used >= cfg.retestDailyLimit) {
          throw new HttpException(
            `今日重测次数已达上限（${cfg.retestDailyLimit}次），请明日再试`,
            HttpStatus.TOO_MANY_REQUESTS,
          )
        }
      }
      // 保留旧结果直至新提交覆盖，符合「以最新覆盖旧结果」
    } else {
      if (!subject.guestToken || !(await this.guestService.isValidToken(subject.guestToken))) {
        throw new BadRequestException('游客身份无效或已过期，请重新进入')
      }
      const used = await this.guestService.getDailyCount(subject.guestToken)
      if (used >= cfg.guestDailyLimit) {
        throw new HttpException('今日测试次数已用完，登录后可无限测试', HttpStatus.TOO_MANY_REQUESTS)
      }
      await this.guestService.clearResult(subject.guestToken)
    }

    return this.getQuestions(subject)
  }

  // ==================== 游客结果迁移 ====================

  /**
   * 游客登录后迁移：将 Redis 游客结果写入 MySQL 并关联真实用户（覆盖旧结果），随后清理 Redis。
   */
  async migrateGuestResult(userId: number, guestToken: string): Promise<PersonalityResultView> {
    if (!guestToken) throw new BadRequestException('缺少游客标识')
    const guestResult = await this.guestService.getResult(guestToken)
    if (!guestResult) {
      throw new BadRequestException('游客测试结果不存在或已过期')
    }

    const type = await this.typeRepo.findOne({
      where: { code: guestResult.typeCode, isDeleted: 0 },
    })

    const testedAt = guestResult.testedAt ? new Date(guestResult.testedAt) : new Date()

    // 覆盖写入用户结果（不写答题明细，游客答题明细不落库）
    await this.upsertResult(userId, {
      typeId: type?.id ?? null,
      typeCode: guestResult.typeCode,
      dimensionScores: {
        radar: guestResult.radar,
        dimensions: guestResult.dimensions,
        typeCode: guestResult.typeCode,
      },
      testedAt,
    })

    // 清理 Redis 游客数据
    await this.guestService.clearAfterMigration(guestToken)

    const saved = await this.resultRepo.findOne({ where: { userId, isDeleted: 0 } })
    return saved ? this.resultEntityToView(saved, false) : { ...guestResult, isGuest: false }
  }

  // ==================== 他人结果（资料卡） ====================

  async getOthersResult(targetUserId: number): Promise<PersonalitySimpleView | null> {
    const result = await this.resultRepo.findOne({
      where: { userId: targetUserId, isDeleted: 0 },
    })
    if (!result) return null

    const type = result.typeId
      ? await this.typeRepo.findOne({ where: { id: result.typeId } })
      : await this.typeRepo.findOne({ where: { code: result.typeCode || '', isDeleted: 0 } })

    const scores: any = result.dimensionScores || {}
    const radar: Record<string, number> = scores.radar || {}
    const dims: Array<{ chosenLabel: string }> = Array.isArray(scores.dimensions) ? scores.dimensions : []

    const tags: string[] = []
    if (type?.name) tags.push(type.name)
    for (const d of dims) {
      if (d.chosenLabel) tags.push(d.chosenLabel)
    }

    return {
      typeCode: result.typeCode || '',
      typeName: type?.name ?? null,
      nickname: type?.nickname ?? null,
      tags,
      radar,
    }
  }

  /** 判断用户是否已完成人格测试（有有效结果） */
  async hasResult(userId: number): Promise<boolean> {
    if (!userId) return false
    const count = await this.resultRepo.count({ where: { userId, isDeleted: 0 } })
    return count > 0
  }

  // ==================== 内部：持久化 ====================

  private async persistUserResult(
    userId: number,
    answers: ScoringAnswer[],
    scoring: ReturnType<typeof computePersonalityResult>,
    type: PersonalityType | null,
    testedAt: Date,
    cfg: { retestDailyLimit: number },
    durationSeconds: number | null,
  ): Promise<void> {
    // 按 userId 查任意已存在行（userId 唯一），避免软删除残留行导致唯一键冲突
    const existing = await this.resultRepo.findOne({ where: { userId } })
    const isRetest = !!existing && existing.isDeleted === 0

    if (isRetest) {
      const used = await this.getRetestCount(userId)
      if (used >= cfg.retestDailyLimit) {
        throw new HttpException(
          `今日重测次数已达上限（${cfg.retestDailyLimit}次），请明日再试`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // 覆盖结果行（userId 唯一，一对一）
      let result = existing
      if (!result) {
        result = manager.create(PersonalityResult, { userId })
      }
      result.typeId = type?.id ?? null
      result.typeCode = scoring.typeCode
      result.dimensionScores = {
        radar: scoring.radar,
        dimensions: scoring.dimensions,
        typeCode: scoring.typeCode,
        durationSeconds,
      }
      result.durationSeconds = durationSeconds
      result.testedAt = testedAt
      result.isDeleted = 0
      const savedResult = await manager.save(PersonalityResult, result)

      // 旧答题记录软删除，写入新记录，关联本次 resultId
      await manager.update(
        PersonalityAnswerRecord,
        { userId, isDeleted: 0 },
        { isDeleted: 1 },
      )
      const records = answers.map((a) =>
        manager.create(PersonalityAnswerRecord, {
          userId,
          questionId: a.questionId,
          optionId: a.optionId,
          resultId: savedResult.id,
          isDeleted: 0,
        }),
      )
      if (records.length > 0) {
        await manager.save(PersonalityAnswerRecord, records)
      }
    })

    if (isRetest) {
      await this.incrRetestCount(userId)
    }
  }

  private async upsertResult(
    userId: number,
    data: { typeId: number | null; typeCode: string; dimensionScores: any; testedAt: Date },
  ): Promise<void> {
    let result = await this.resultRepo.findOne({ where: { userId } })
    if (!result) {
      result = this.resultRepo.create({ userId })
    }
    result.typeId = data.typeId
    result.typeCode = data.typeCode
    result.dimensionScores = data.dimensionScores
    result.testedAt = data.testedAt
    result.isDeleted = 0
    await this.resultRepo.save(result)
  }

  // ==================== 内部：埋点计数（完成率/游客数） ====================

  /** 累加统计计数器（失败不阻塞主流程） */
  private bumpStat(name: 'started' | 'completed' | 'guest_total'): void {
    this.redis.incr(`${PersonalityUserService.STAT_PREFIX}:${name}`).catch(() => {})
  }

  /** 累加游客当日新增计数（东八区自然日，保留 2 天） */
  private bumpGuestDaily(): void {
    const key = `${PersonalityUserService.STAT_PREFIX}:guest_daily:${shanghaiDayKey()}`
    this.redis
      .incr(key)
      .then(() => this.redis.expire(key, 2 * 86400))
      .catch(() => {})
  }

  private async createSession(questionIds: number[], subject: string): Promise<string> {
    const sessionId = `s${Date.now().toString(36)}${randomBytes(12).toString('hex')}`
    const payload: QuizSession = { issuedAt: Date.now(), questionIds, subject }
    await this.redis.set(this.sessionKey(sessionId), JSON.stringify(payload), PersonalityUserService.SESSION_TTL)
    return sessionId
  }

  private async assertDuration(input: SubmitInput, answers: SubmitAnswerInput[], minSeconds: number): Promise<void> {
    let serverDuration: number | null = null
    if (input.sessionId) {
      const raw = await this.redis.get(this.sessionKey(input.sessionId))
      if (raw) {
        try {
          const session = JSON.parse(raw) as QuizSession
          if (session?.issuedAt) {
            serverDuration = (Date.now() - session.issuedAt) / 1000
          }
        } catch {
          /* ignore */
        }
      }
    }

    // 客户端首末题时间差（作为回退口径）
    const times = answers
      .map((a) => Number(a.answeredAt))
      .filter((t) => Number.isFinite(t) && t > 0)
    const clientDuration = times.length >= 2 ? (Math.max(...times) - Math.min(...times)) / 1000 : null

    // 服务端会话为权威口径；无会话时回退客户端；两者均无则不拦截（避免误伤）
    const duration = serverDuration ?? clientDuration
    if (duration !== null && duration < minSeconds) {
      throw new HttpException('请认真答题', HttpStatus.BAD_REQUEST)
    }
  }

  /** 登录用户今日重测次数 */
  private async getRetestCount(userId: number): Promise<number> {
    const raw = await this.redis.get(this.retestKey(userId))
    return raw ? parseInt(raw, 10) || 0 : 0
  }

  private async incrRetestCount(userId: number): Promise<void> {
    const key = this.retestKey(userId)
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, secondsUntilShanghaiMidnight() + 60)
    }
  }

  // ==================== 内部：数据加载 ====================

  private async loadDimensions(): Promise<ScoringDimension[]> {
    const dims = await this.dimensionRepo.find({
      where: { isDeleted: 0, isEnabled: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    })
    return dims.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      directionAKey: d.directionAKey,
      directionALabel: d.directionALabel,
      directionBKey: d.directionBKey,
      directionBLabel: d.directionBLabel,
      sort: d.sort,
    }))
  }

  private async loadOptionsByQuestionIds(questionIds: number[]): Promise<Map<number, PersonalityOption[]>> {
    const map = new Map<number, PersonalityOption[]>()
    if (questionIds.length === 0) return map
    const options = await this.optionRepo.find({
      where: { questionId: In(questionIds) },
      order: { sort: 'ASC', id: 'ASC' },
    })
    for (const o of options) {
      const arr = map.get(o.questionId) || []
      arr.push(o)
      map.set(o.questionId, arr)
    }
    return map
  }

  /** 抽取 N 道题：优先保证每个维度至少一道，再随机补足 */
  private selectQuestions(pool: PersonalityQuestion[], n: number): PersonalityQuestion[] {
    const byDim = new Map<number, PersonalityQuestion[]>()
    for (const q of pool) {
      const arr = byDim.get(q.dimensionId) || []
      arr.push(q)
      byDim.set(q.dimensionId, arr)
    }

    const selected: PersonalityQuestion[] = []
    const usedIds = new Set<number>()

    // 每个维度先随机取一道，保证覆盖
    for (const arr of byDim.values()) {
      const pick = shuffle(arr)[0]
      if (pick && !usedIds.has(pick.id)) {
        selected.push(pick)
        usedIds.add(pick.id)
      }
    }

    // 覆盖数已超过 N，则截断
    if (selected.length >= n) {
      return shuffle(selected).slice(0, n)
    }

    // 其余随机补足
    const rest = shuffle(pool.filter((q) => !usedIds.has(q.id)))
    for (const q of rest) {
      if (selected.length >= n) break
      selected.push(q)
      usedIds.add(q.id)
    }

    return shuffle(selected)
  }

  // ==================== 内部：视图转换 ====================

  /**
   * 游客简化版结果：隐藏详细性格解析与适配推荐，保留类型/花名/一句话描述/雷达图，
   * 引导登录后迁移查看完整解析。
   */
  private toGuestSimplified(view: PersonalityResultView): PersonalityResultView {
    return { ...view, description: null, matchTypes: [], matchTypeDetails: [] }
  }

  private async resultEntityToView(result: PersonalityResult, isGuest: boolean): Promise<PersonalityResultView> {
    const type = result.typeId
      ? await this.typeRepo.findOne({ where: { id: result.typeId } })
      : await this.typeRepo.findOne({ where: { code: result.typeCode || '', isDeleted: 0 } })
    const scores: any = result.dimensionScores || {}
    const matchTypes = type?.matchTypes ?? []
    const matchTypeDetails = await this.loadMatchTypeDetails(matchTypes)
    return {
      typeCode: result.typeCode || scores.typeCode || '',
      typeName: type?.name ?? null,
      nickname: type?.nickname ?? null,
      summary: type?.summary ?? null,
      description: type?.description ?? null,
      radar: scores.radar || {},
      dimensions: Array.isArray(scores.dimensions) ? scores.dimensions : [],
      matchTypes,
      matchTypeDetails,
      testedAt: (result.testedAt || result.updatedAt || new Date()).toISOString?.() || new Date().toISOString(),
      isGuest,
    }
  }

  /** 按类型编码批量查询名称/花名，保持入参顺序 */
  private async loadMatchTypeDetails(
    codes: string[],
  ): Promise<Array<{ code: string; name: string | null; nickname: string | null }>> {
    if (!Array.isArray(codes) || codes.length === 0) return []
    const types = await this.typeRepo.find({ where: { code: In(codes), isDeleted: 0 } })
    const byCode = new Map(types.map((t) => [t.code, t]))
    return codes.map((code) => {
      const t = byCode.get(code)
      return { code, name: t?.name ?? null, nickname: t?.nickname ?? null }
    })
  }

  // ==================== 内部：剩余次数 ====================

  private async remainingAttempts(
    subject: { userId?: number; guestToken?: string },
    cfg: { guestDailyLimit: number; retestDailyLimit: number },
  ): Promise<number | null> {
    if (subject.userId) {
      const existing = await this.resultRepo.findOne({ where: { userId: subject.userId, isDeleted: 0 } })
      if (!existing) return null // 首次测试不受重测次数限制
      const used = await this.getRetestCount(subject.userId)
      return Math.max(0, cfg.retestDailyLimit - used)
    }
    if (subject.guestToken) {
      const used = await this.guestService.getDailyCount(subject.guestToken)
      return Math.max(0, cfg.guestDailyLimit - used)
    }
    return null
  }

  // ==================== 内部：Redis key ====================

  private sessionKey(sessionId: string): string {
    return `${PersonalityUserService.SESSION_PREFIX}:${sessionId}`
  }

  private retestKey(userId: number): string {
    return `ptest:retest:${userId}:${shanghaiDayKey()}`
  }
}
