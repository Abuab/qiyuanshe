import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiSafetyService } from './ai-safety.service'
import { AiPromptTemplateService } from './ai-prompt-template.service'
import { AiFeatureKey } from './types'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { beijingISO } from '../common/utils/date-utils'
import { User } from '../entities/User'
import { PersonalityResult } from '../personality-test/entities/PersonalityResult'
import { PersonalityType } from '../personality-test/entities/PersonalityType'
import { parseJsonResponse } from './ai-common.util'
import { PROMPT_KEYS, SHARE_STYLE_KEY_MAP, ShareCopyStyle } from './ai-personality.prompt'
import { COMPLIANCE_PROMPT, isCompliant } from './ai-personality.compliance'
import {
  AI_DISCLAIMER,
  InterpretationResult,
  MatchAdviceResult,
  ShareCopyResult,
} from './ai-personality.types'

interface PersonalityContext {
  result: PersonalityResult
  nickname: string
  typeCode: string
  typeName: string
  typeSummary: string
  typeDescription: string
  dimensionDetail: string
}

@Injectable()
export class AiPersonalityService {
  private readonly logger = new Logger(AiPersonalityService.name)

  constructor(
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(PersonalityResult)
    private readonly resultRepo: Repository<PersonalityResult>,
    @InjectRepository(PersonalityType)
    private readonly typeRepo: Repository<PersonalityType>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redis: RedisService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiApiService: AiApiService,
    private readonly safetyService: AiSafetyService,
    private readonly promptTemplateService: AiPromptTemplateService,
  ) {}

  // ==================== AI 性格深度解读 ====================

  async getInterpretation(userId: number, force = false): Promise<InterpretationResult> {
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.PERSONALITY)
    if (!enabled) throw new BadRequestException('AI_FEATURE_DISABLED:AI性格解读暂不可用')

    const ctx = await this.loadContext(userId)
    if (!ctx) throw new BadRequestException('NO_PERSONALITY_RESULT:请先完成人格测试')

    // 命中缓存：解读已生成且不早于最近一次测试（重测后 testedAt 变新 → 自动失效重生成）
    if (!force && ctx.result.aiInterpretation && ctx.result.aiInterpretationAt) {
      const testedMs = ctx.result.testedAt ? new Date(ctx.result.testedAt).getTime() : 0
      const genMs = new Date(ctx.result.aiInterpretationAt).getTime()
      if (genMs >= testedMs) {
        try {
          const cached = JSON.parse(ctx.result.aiInterpretation)
          return {
            typeCode: ctx.typeCode,
            typeName: ctx.typeName,
            loveStrengths: cached.loveStrengths || '',
            cautions: cached.cautions || '',
            idealPartner: cached.idealPartner || '',
            dateScenes: cached.dateScenes || '',
            fallback: false,
            disclaimer: AI_DISCLAIMER,
            generatedAt: beijingISO(new Date(ctx.result.aiInterpretationAt)),
          }
        } catch {
          /* 缓存损坏，继续重新生成 */
        }
      }
    }

    const callLog = await this.callLogRepo.save(
      this.callLogRepo.create({
        userId,
        callType: AiCallType.PERSONALITY,
        consumeCount: 1,
        responseStatus: 'success',
        requestSummary: JSON.stringify({ typeCode: ctx.typeCode }),
      }),
    )

    const template = await this.promptTemplateService.getTemplate(PROMPT_KEYS.PERSONALITY)
    const prompt = `${this.promptTemplateService.render(template, {
      nickname: ctx.nickname,
      typeName: ctx.typeName,
      typeCode: ctx.typeCode,
      typeSummary: ctx.typeSummary,
      dimensionDetail: ctx.dimensionDetail,
    })}\n\n${COMPLIANCE_PROMPT}`

    let sections = { loveStrengths: '', cautions: '', idealPartner: '', dateScenes: '' }
    let fallback = false
    const startMs = Date.now()
    try {
      if (await this.aiApiService.isConfigured()) {
        const raw = await this.aiApiService.callAndLog({ prompt, responseJson: true }, userId, 'personality')
        const parsed = parseJsonResponse(raw)
        sections = {
          loveStrengths: this.str(parsed.loveStrengths),
          cautions: this.str(parsed.cautions),
          idealPartner: this.str(parsed.idealPartner),
          dateScenes: this.str(parsed.dateScenes),
        }
        if (!sections.loveStrengths && !sections.cautions) throw new Error('AI 返回内容为空')
      } else {
        fallback = true
      }
    } catch (e: any) {
      this.logger.warn(`[AI性格解读] 调用失败降级: ${e?.message}`)
      fallback = true
      callLog.responseStatus = 'error'
    }

    // 合规 + 安全校验：不通过则降级兜底
    const combined = `${sections.loveStrengths} ${sections.cautions} ${sections.idealPartner} ${sections.dateScenes}`
    if (fallback || !isCompliant(combined) || !this.safetyService.checkText(combined).passed) {
      sections = this.fallbackInterpretation(ctx)
      fallback = true
    }

    callLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(callLog).catch(() => {})
    await this.safetyService.checkAndAudit(JSON.stringify(sections), callLog.id).catch(() => {})

    // 仅缓存 AI 成功结果；降级内容不落库，便于下次自动重试
    const generatedAt = new Date()
    if (!fallback) {
      ctx.result.aiInterpretation = JSON.stringify(sections)
      ctx.result.aiInterpretationAt = generatedAt
      await this.resultRepo.save(ctx.result).catch(() => {})
    }

    return {
      typeCode: ctx.typeCode,
      typeName: ctx.typeName,
      ...sections,
      fallback,
      disclaimer: AI_DISCLAIMER,
      generatedAt: beijingISO(generatedAt),
    }
  }

  // ==================== AI 红娘匹配建议 ====================

  /** 是否可展示「AI红娘说」入口：功能开启 且 双方均已测试 */
  async getMatchAdviceEligibility(userId: number, targetUserId: number): Promise<{ eligible: boolean }> {
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.MATCH_ADVICE)
    if (!enabled || !targetUserId || userId === targetUserId) return { eligible: false }
    const [a, b] = await Promise.all([this.isTested(userId), this.isTested(targetUserId)])
    return { eligible: a && b }
  }

  async getMatchAdvice(userId: number, targetUserId: number): Promise<MatchAdviceResult> {
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.MATCH_ADVICE)
    if (!enabled) throw new BadRequestException('AI_FEATURE_DISABLED:AI红娘匹配建议暂不可用')
    if (!targetUserId || userId === targetUserId) throw new BadRequestException('参数错误')

    const [ctxA, ctxB] = await Promise.all([this.loadContext(userId), this.loadContext(targetUserId)])
    if (!ctxA || !ctxB) throw new BadRequestException('NOT_BOTH_TESTED:双方均完成人格测试后可查看')

    const cacheKey = `ai:pmatch:${userId}:${targetUserId}`
    const aTested = ctxA.result.testedAt ? new Date(ctxA.result.testedAt).getTime() : 0
    const bTested = ctxB.result.testedAt ? new Date(ctxB.result.testedAt).getTime() : 0
    const cachedRaw = await this.redis.get(cacheKey)
    if (cachedRaw) {
      try {
        const c = JSON.parse(cachedRaw)
        if (c.aTested === aTested && c.bTested === bTested && c.data) {
          return { ...c.data, fallback: false, disclaimer: AI_DISCLAIMER }
        }
      } catch {
        /* ignore */
      }
    }

    const callLog = await this.callLogRepo.save(
      this.callLogRepo.create({
        userId,
        callType: AiCallType.MATCH_ADVICE,
        consumeCount: 1,
        requestSummary: JSON.stringify({ targetUserId, a: ctxA.typeCode, b: ctxB.typeCode }),
      }),
    )

    const template = await this.promptTemplateService.getTemplate(PROMPT_KEYS.MATCH_ADVICE)
    const prompt = `${this.promptTemplateService.render(template, {
      nickname: ctxA.nickname,
      typeName: ctxA.typeName,
      typeCode: ctxA.typeCode,
      dimensionDetail: ctxA.dimensionDetail,
      taNickname: ctxB.nickname,
      taTypeName: ctxB.typeName,
      taTypeCode: ctxB.typeCode,
      taDimensionDetail: ctxB.dimensionDetail,
    })}\n\n${COMPLIANCE_PROMPT}`

    let data = { complement: '', friction: '', icebreakers: [] as string[], dateScenes: [] as string[] }
    let fallback = false
    const startMs = Date.now()
    try {
      if (await this.aiApiService.isConfigured()) {
        const raw = await this.aiApiService.callAndLog({ prompt, responseJson: true }, userId, 'match_advice')
        const parsed = parseJsonResponse(raw)
        data = {
          complement: this.str(parsed.complement),
          friction: this.str(parsed.friction),
          icebreakers: this.arr(parsed.icebreakers, 3),
          dateScenes: this.arr(parsed.dateScenes, 2),
        }
        if (!data.complement && data.icebreakers.length === 0) throw new Error('AI 返回内容为空')
      } else {
        fallback = true
      }
    } catch (e: any) {
      this.logger.warn(`[AI匹配建议] 调用失败降级: ${e?.message}`)
      fallback = true
      callLog.responseStatus = 'error'
    }

    const combined = `${data.complement} ${data.friction} ${data.icebreakers.join(' ')} ${data.dateScenes.join(' ')}`
    if (fallback || !isCompliant(combined) || !this.safetyService.checkText(combined).passed) {
      data = this.fallbackMatchAdvice(ctxA, ctxB)
      fallback = true
    }

    callLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(callLog).catch(() => {})
    await this.safetyService.checkAndAudit(JSON.stringify(data), callLog.id).catch(() => {})

    if (!fallback) {
      await this.redis
        .set(cacheKey, JSON.stringify({ aTested, bTested, data }), 7 * 86400)
        .catch(() => {})
    }

    return { ...data, fallback, disclaimer: AI_DISCLAIMER }
  }

  // ==================== AI 分享文案 ====================

  async getShareCopies(userId: number, style: string): Promise<ShareCopyResult> {
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.PERSONALITY)
    if (!enabled) throw new BadRequestException('AI_FEATURE_DISABLED:AI性格解读暂不可用')

    const validStyle: ShareCopyStyle =
      style === 'literary' || style === 'sincere' ? style : 'humor'

    const ctx = await this.loadContext(userId)
    if (!ctx) throw new BadRequestException('NO_PERSONALITY_RESULT:请先完成人格测试')

    const cacheKey = `ai:sharecopy:${userId}:${validStyle}:${ctx.typeCode}`
    const cachedRaw = await this.redis.get(cacheKey)
    if (cachedRaw) {
      try {
        const copies = JSON.parse(cachedRaw)
        if (Array.isArray(copies) && copies.length > 0) {
          return { style: validStyle, copies, fallback: false, disclaimer: AI_DISCLAIMER }
        }
      } catch {
        /* ignore */
      }
    }

    const callLog = await this.callLogRepo.save(
      this.callLogRepo.create({
        userId,
        callType: AiCallType.SHARE_COPY,
        consumeCount: 1,
        requestSummary: JSON.stringify({ style: validStyle, typeCode: ctx.typeCode }),
      }),
    )

    const template = await this.promptTemplateService.getTemplate(SHARE_STYLE_KEY_MAP[validStyle])
    const prompt = `${this.promptTemplateService.render(template, {
      nickname: ctx.nickname,
      typeName: ctx.typeName,
      typeCode: ctx.typeCode,
      typeSummary: ctx.typeSummary,
    })}\n\n${COMPLIANCE_PROMPT}`

    let copies: string[] = []
    let fallback = false
    const startMs = Date.now()
    try {
      if (await this.aiApiService.isConfigured()) {
        const raw = await this.aiApiService.callAndLog({ prompt, responseJson: true }, userId, 'share_copy')
        const parsed = parseJsonResponse(raw)
        copies = this.arr(parsed.copies, 3).filter((c) => isCompliant(c) && this.safetyService.checkText(c).passed)
        if (copies.length === 0) throw new Error('AI 返回内容为空或不合规')
      } else {
        fallback = true
      }
    } catch (e: any) {
      this.logger.warn(`[AI分享文案] 调用失败降级: ${e?.message}`)
      fallback = true
      callLog.responseStatus = 'error'
    }

    if (fallback || copies.length === 0) {
      copies = this.fallbackShareCopies(ctx, validStyle)
      fallback = true
    }

    callLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(callLog).catch(() => {})
    await this.safetyService.checkAndAudit(JSON.stringify(copies), callLog.id).catch(() => {})

    if (!fallback) {
      await this.redis.set(cacheKey, JSON.stringify(copies), 86400).catch(() => {})
    }

    return { style: validStyle, copies, fallback, disclaimer: AI_DISCLAIMER }
  }

  // ==================== 内部辅助 ====================

  private async isTested(userId: number): Promise<boolean> {
    const cnt = await this.resultRepo.count({ where: { userId, isDeleted: 0 } })
    return cnt > 0
  }

  private async loadContext(userId: number): Promise<PersonalityContext | null> {
    const result = await this.resultRepo.findOne({ where: { userId, isDeleted: 0 } })
    if (!result || !result.testedAt) return null

    let type: PersonalityType | null = null
    if (result.typeId) {
      type = await this.typeRepo.findOne({ where: { id: result.typeId } })
    } else if (result.typeCode) {
      type = await this.typeRepo.findOne({ where: { code: result.typeCode } })
    }
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'nickname'] })

    const scores: any = result.dimensionScores || {}
    const dims = Array.isArray(scores.dimensions) ? scores.dimensions : []
    let dimensionDetail: string
    if (dims.length > 0) {
      dimensionDetail = dims
        .map((d: any) => `- ${d.name || d.code}：${d.chosenLabel || ''}（强度 ${d.radar ?? '-'}）`)
        .join('\n')
    } else {
      const radar = scores.radar || {}
      dimensionDetail = Object.keys(radar).length
        ? Object.entries(radar).map(([k, v]) => `- ${k}：${v}`).join('\n')
        : '（暂无维度明细）'
    }

    return {
      result,
      nickname: user?.nickname || '这位朋友',
      typeCode: result.typeCode || type?.code || '',
      typeName: type?.name || result.typeCode || '未知类型',
      typeSummary: type?.summary || '',
      typeDescription: type?.description || '',
      dimensionDetail,
    }
  }

  private str(v: any): string {
    if (v === undefined || v === null) return ''
    if (Array.isArray(v)) return v.map((x) => String(x)).join('；')
    return String(v).trim()
  }

  private arr(v: any, max: number): string[] {
    if (!Array.isArray(v)) return []
    return v.map((x) => String(x).trim()).filter((x) => x.length > 0).slice(0, max)
  }

  // -------- 降级兜底（合规、基于类型/维度，不阻塞页面）--------

  private fallbackInterpretation(ctx: PersonalityContext): {
    loveStrengths: string
    cautions: string
    idealPartner: string
    dateScenes: string
  } {
    const t = ctx.typeName
    const base = ctx.typeSummary || ctx.typeDescription || '你有着独特而真诚的性格特质'
    return {
      loveStrengths: `作为「${t}」，${base}。在恋爱中，你往往能以真诚和用心对待感情，容易赢得对方的信任。`,
      cautions: `相处中建议多主动表达自己的想法与感受，遇到分歧时保持耐心沟通，给彼此一些理解的空间。`,
      idealPartner: `你比较适合与能够欣赏你性格特质、愿意坦诚沟通、性格互补度较高的伴侣相处，彼此扶持共同成长。`,
      dateScenes: `可以尝试安静的咖啡馆深聊、一起看展或短途出行等场景，在轻松氛围中自然地增进了解。`,
    }
  }

  private fallbackMatchAdvice(a: PersonalityContext, b: PersonalityContext): {
    complement: string
    friction: string
    icebreakers: string[]
    dateScenes: string[]
  } {
    return {
      complement: `${a.typeName} 与 ${b.typeName} 在性格上各有特点，若能相互欣赏差异，往往能形成不错的互补，性格互补度较高。`,
      friction: `两人在沟通节奏或决策方式上可能存在差异，建议多一些换位思考与耐心，遇到分歧时坦诚交流。`,
      icebreakers: [
        '最近有什么让你特别有成就感的小事吗？',
        '你理想中的周末是怎么度过的？',
        '如果可以去一个地方旅行，你最想去哪里？',
      ],
      dateScenes: ['找一家氛围安静的咖啡馆聊聊彼此的兴趣', '一起去看展或逛书店，在共同话题中增进了解'],
    }
  }

  private fallbackShareCopies(ctx: PersonalityContext, style: ShareCopyStyle): string[] {
    const t = ctx.typeName
    if (style === 'literary') {
      return [
        `原来我是「${t}」，愿遇见懂我的那束光。`,
        `性格如诗，「${t}」的我，等一场恰好的相逢。`,
        `测出「${t}」，愿以真心，赴一场温柔。`,
      ]
    }
    if (style === 'sincere') {
      return [
        `我是「${t}」，真诚待人，也期待被真诚以待。`,
        `性格测试说我是「${t}」，很想认识同样认真生活的你。`,
        `「${t}」的我，愿意用心经营每一段关系。`,
      ]
    }
    return [
      `刚测出我是「${t}」，据说很难被套路，不信来试试？`,
      `官方认证「${t}」本人，主打一个有趣的灵魂~`,
      `「${t}」上线，缘分请自觉靠近，谢谢配合。`,
    ]
  }
}
