import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiFeatureKey } from './types'
import { AiCallLog } from '../entities/AiCallLog'
import { AiCallType } from '../entities/AiCallLog'
import { AiMatchReport } from '../entities/AiMatchReport'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { UserSystemTag } from '../entities/UserSystemTag'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { HotQuestion } from '../entities/HotQuestion'
import { UserNotification } from '../entities/UserNotification'
import { buildMatchPrompt } from './ai-match.prompt'
import {
  MatchUserSnapshot,
  MatchPairSnapshot,
  MatchEligibilityCheck,
  MatchReportResponse,
  MatchQuotaInfo,
  AiMatchResultRaw,
  MATCH_FREE_DAILY_LIMIT,
  MATCH_VIP_DAILY_LIMIT,
  MATCH_MIN_TAGS,
  MATCH_MIN_ANSWERS,
  COMPLETENESS_WEIGHTS,
} from './ai-match.types'

@Injectable()
export class AiMatchService {
  private readonly logger = new Logger(AiMatchService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserTagSelection)
    private readonly tagSelectionRepo: Repository<UserTagSelection>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepo: Repository<QuestionAnswer>,
    @InjectRepository(AiMatchReport)
    private readonly matchReportRepo: Repository<AiMatchReport>,
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(UserNotification)
    private readonly notifyRepo: Repository<UserNotification>,
    private readonly redis: RedisService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiApiService: AiApiService,
  ) {}

  // ==================== 公开 API ====================

  /**
   * 检查双方资料是否满足 AI 分析的最低条件
   * 综合评分：头像(15) + 年龄(10) + 身高(10) + 学历(10) + 收入(10) + 城市(10) + 职业(5) + 标签(15) + 问答(15) = 100
   * 阈值：双方各自 ≥ 60% 才可分析
   */
  async checkEligibility(userId: number, targetUserId: number): Promise<MatchEligibilityCheck> {
    const [selfUser, taUser] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.userRepo.findOne({ where: { id: targetUserId } }),
    ])

    const [myTags, taTags, myAnswers, taAnswers] = await Promise.all([
      this.getSelectedTagCount(userId),
      this.getSelectedTagCount(targetUserId),
      this.getApprovedAnswerCount(userId),
      this.getApprovedAnswerCount(targetUserId),
    ])

    // 检查对方是否今天已被提醒过
    const hasReminded = await this.hasRemindedToday(userId, targetUserId)

    const selfCompleteness = this.calcCompleteness(selfUser, myTags, myAnswers)
    const targetCompleteness = this.calcCompleteness(taUser, taTags, taAnswers)

    const reasons: string[] = []
    const W = COMPLETENESS_WEIGHTS

    // 自己的详细原因
    if (!selfUser?.avatar || selfUser.avatar.trim() === '') reasons.push('您未上传头像')
    if (!selfUser?.birthYear) reasons.push('您未填写出生年份')
    if (!selfUser?.height) reasons.push('您未填写身高')
    if (!selfUser?.education) reasons.push('您未填写学历')
    if (!selfUser?.incomeRange) reasons.push('您未填写收入')
    if (!selfUser?.residence) reasons.push('您未填写所在城市')
    if (myTags < MATCH_MIN_TAGS) reasons.push(`您的标签不足${MATCH_MIN_TAGS}个`)
    if (myAnswers < MATCH_MIN_ANSWERS) reasons.push(`您的问答不足${MATCH_MIN_ANSWERS}条`)

    // 对方的详细原因
    if (!taUser?.avatar || taUser.avatar.trim() === '') reasons.push('对方未上传头像')
    if (!taUser?.birthYear) reasons.push('对方未填写出生年份')
    if (!taUser?.height) reasons.push('对方未填写身高')
    if (!taUser?.education) reasons.push('对方未填写学历')
    if (!taUser?.incomeRange) reasons.push('对方未填写收入')
    if (!taUser?.residence) reasons.push('对方未填写所在城市')
    if (taTags < MATCH_MIN_TAGS) reasons.push(`对方标签不足${MATCH_MIN_TAGS}个`)
    if (taAnswers < MATCH_MIN_ANSWERS) reasons.push(`对方问答不足${MATCH_MIN_ANSWERS}条`)

    const selfOk = selfCompleteness >= W.MIN_COMPLETENESS
    const taOk = targetCompleteness >= W.MIN_COMPLETENESS

    let insufficientSide: MatchEligibilityCheck['insufficientSide'] = null
    if (!selfOk && !taOk) insufficientSide = 'both'
    else if (!selfOk) insufficientSide = 'self'
    else if (!taOk) insufficientSide = 'target'

    return {
      eligible: selfOk && taOk,
      reasons,
      myTagCount: myTags,
      myAnswerCount: myAnswers,
      taTagCount: taTags,
      taAnswerCount: taAnswers,
      selfCompleteness,
      targetCompleteness,
      canAnalyze: selfOk && taOk,
      insufficientSide,
      hasReminded,
    }
  }

  /** 计算单个用户的资料完整度 (0-100) */
  private calcCompleteness(user: User | null, tagCount: number, answerCount: number): number {
    if (!user) return 0
    const W = COMPLETENESS_WEIGHTS
    let score = 0

    // 头像（有值即得分）
    if (user.avatar && user.avatar.trim().length > 0) score += W.AVATAR
    // 基础信息
    if (user.birthYear) score += W.AGE
    if (user.height) score += W.HEIGHT
    if (user.education) score += W.EDUCATION
    if (user.incomeRange) score += W.INCOME
    if (user.residence) score += W.CITY
    if (user.occupation) score += W.OCCUPATION
    // 标签（每标签 5 分，上限 15）
    score += Math.min(tagCount * W.TAG_PER, W.TAG_MAX)
    // 问答（每问答 5 分，上限 15）
    score += Math.min(answerCount * W.ANSWER_PER, W.ANSWER_MAX)

    return Math.min(100, score)
  }

  /**
   * 执行缘分匹配分析（核心方法）
   */
  async analyze(userId: number, targetUserId: number): Promise<MatchReportResponse> {
    // 1. 校验 AI 开关
    const featureEnabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.MATCH)
    if (!featureEnabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI缘分匹配功能暂不可用')
    }

    // 2. 资料完备校验
    const eligibility = await this.checkEligibility(userId, targetUserId)
    if (!eligibility.eligible) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_DATA',
        message: '资料完整度不足，完善后可解锁AI缘分分析',
        reasons: eligibility.reasons,
        selfCompleteness: eligibility.selfCompleteness,
        targetCompleteness: eligibility.targetCompleteness,
        canAnalyze: eligibility.canAnalyze,
        insufficientSide: eligibility.insufficientSide,
        hasReminded: eligibility.hasReminded,
      })
    }

    // 3. 检查 7 天内缓存
    const cached = await this.matchReportRepo.findOne({
      where: { userId, targetUserId },
      order: { updatedAt: 'DESC' },
    })
    if (cached) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const age = Date.now() - new Date(cached.createdAt).getTime()
      if (age < sevenDaysMs) {
        const quota = await this.getQuota(userId)
        return this.buildResponse(cached, true, quota.remaining)
      }
    }

    // 4. 检查次数限制
    const quota = await this.checkAndIncrementQuota(userId)
    if (quota.remaining < 0) {
      throw new BadRequestException({
        code: 'QUOTA_EXCEEDED',
        message: quota.dailyLimit === MATCH_FREE_DAILY_LIMIT
          ? `今日免费次数已用完（${MATCH_FREE_DAILY_LIMIT}/天），开通会员享受${MATCH_VIP_DAILY_LIMIT}次/天`
          : `今日分析次数已用完（${MATCH_VIP_DAILY_LIMIT}/天）`,
        quota,
      })
    }

    // 5. 收集双方数据
    const [meSnapshot, taSnapshot] = await Promise.all([
      this.buildUserSnapshot(userId),
      this.buildUserSnapshot(targetUserId),
    ])

    const overlapTags = taSnapshot.tags.filter((t) => meSnapshot.tags.includes(t))

    const pairSnapshot: MatchPairSnapshot = {
      me: meSnapshot,
      ta: taSnapshot,
      overlapTags,
    }

    // 6. 构建 Prompt & 调用 AI
    const prompt = buildMatchPrompt({
      me: {
        ...meSnapshot,
      },
      ta: {
        ...taSnapshot,
      },
      overlapTags,
    })

    const startMs = Date.now()
    let aiResult: AiMatchResultRaw
    let aiCallLog: AiCallLog | null = null

    try {
      // 记录 AI 调用日志（请求）
      aiCallLog = this.callLogRepo.create({
        userId,
        callType: AiCallType.MATCH,
        consumeCount: 1,
        ipAddress: '',
        deviceFingerprint: '',
        requestSummary: JSON.stringify({
          userId,
          targetUserId,
          promptLength: prompt.length,
        }),
        responseStatus: 'success',
        safetyFlag: 0,
      })
      aiCallLog = await this.callLogRepo.save(aiCallLog)

      // 【注】此处为 AI 调用的占位实现
      // 实际部署时替换为真正的 AI API 调用（如 OpenRouter/Qwen/DeepSeek）
      if (await this.aiApiService.isConfigured()) {
        const aiResponse = await this.aiApiService.callAndLog({ prompt, responseJson: true }, userId, 'match')
        aiResult = this.parseJsonResponse(aiResponse)
      } else {
        aiResult = this.buildFallbackResult(meSnapshot, taSnapshot, overlapTags)
      }

    } catch (e: any) {
      this.logger.warn(`AI match analysis call failed: ${e?.message}, using fallback`)
      aiResult = this.buildFallbackResult(meSnapshot, taSnapshot, overlapTags)
      if (aiCallLog) {
        aiCallLog.responseStatus = 'error'
        await this.callLogRepo.save(aiCallLog)
      }
      throw new BadRequestException('AI分析暂时不可用，请稍后重试')
    }

    const generationMs = Date.now() - startMs

    // 更新 AI 调用日志（响应）
    if (aiCallLog) {
      aiCallLog.responseMs = generationMs
      aiCallLog.responseStatus = 'success'
      await this.callLogRepo.save(aiCallLog)
    }

    // 7. 写入/更新报告缓存
    let report = cached
    if (report) {
      report.overallScore = aiResult.overallScore
      report.valuesScore = aiResult.valuesScore
      report.lifestyleScore = aiResult.lifestyleScore
      report.futurePlanScore = aiResult.futurePlanScore
      report.analysisText = aiResult.analysis
      report.adviceList = JSON.stringify(aiResult.advice)
      report.userTagCount = meSnapshot.tags.length
      report.targetTagCount = taSnapshot.tags.length
      report.overlapTagCount = overlapTags.length
      report.userAnswerCount = meSnapshot.answers.length
      report.targetAnswerCount = taSnapshot.answers.length
      report.generationMs = generationMs
      report.aiCallLogId = aiCallLog?.id ?? null
    } else {
      report = this.matchReportRepo.create({
        userId,
        targetUserId,
        overallScore: aiResult.overallScore,
        valuesScore: aiResult.valuesScore,
        lifestyleScore: aiResult.lifestyleScore,
        futurePlanScore: aiResult.futurePlanScore,
        analysisText: aiResult.analysis,
        adviceList: JSON.stringify(aiResult.advice),
        userTagCount: meSnapshot.tags.length,
        targetTagCount: taSnapshot.tags.length,
        overlapTagCount: overlapTags.length,
        userAnswerCount: meSnapshot.answers.length,
        targetAnswerCount: taSnapshot.answers.length,
        generationMs,
        aiCallLogId: aiCallLog?.id ?? null,
      })
    }
    await this.matchReportRepo.save(report)

    return this.buildResponse(report, false, quota.remaining)
  }

  /**
   * 清除指定用户的全部缓存报告（用户资料变更时调用）
   */
  async clearUserCaches(userId: number): Promise<void> {
    await this.matchReportRepo.delete({ userId })
    await this.matchReportRepo.delete({ targetUserId: userId })
    this.logger.log(`Cleared match report caches for user ${userId}`)
  }

  /**
   * 获取用户今日剩余配额
   */
  async getQuota(userId: number): Promise<MatchQuotaInfo> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()
    const dailyLimit = isVip ? MATCH_VIP_DAILY_LIMIT : MATCH_FREE_DAILY_LIMIT

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const usedToday = await this.callLogRepo.count({
      where: {
        userId,
        callType: AiCallType.MATCH,
        createdAt: MoreThanOrEqual(todayStart),
      },
    })

    return {
      dailyLimit,
      usedToday,
      remaining: Math.max(0, dailyLimit - usedToday),
    }
  }

  /**
   * 查询缓存报告（只读，不触发新分析，不创建AiCallLog）
   */
  async getCachedReport(userId: number, targetUserId: number): Promise<MatchReportResponse | null> {
    const cached = await this.matchReportRepo.findOne({
      where: { userId, targetUserId },
      order: { updatedAt: 'DESC' },
    })
    if (!cached) return null

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const age = Date.now() - new Date(cached.createdAt).getTime()
    if (age >= sevenDaysMs) return null

    const quota = await this.getQuota(userId)
    return this.buildResponse(cached, true, quota.remaining)
  }

  /**
   * 一键提醒对方完善资料（发送系统通知）
   */
  async remindTargetToCompleteProfile(userId: number, targetUserId: number): Promise<{ sent: boolean }> {
    const eligibility = await this.checkEligibility(userId, targetUserId)

    // 只有对方资料完整度不足时才发提醒
    if (eligibility.targetCompleteness >= COMPLETENESS_WEIGHTS.MIN_COMPLETENESS) {
      throw new BadRequestException('对方资料已完整，无需提醒')
    }

    // 24 小时内已提醒过
    if (eligibility.hasReminded) {
      return { sent: false }
    }

    // 检查 24 小时内是否已发送过提醒（防止并发）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentNotify = await this.notifyRepo.findOne({
      where: {
        userId: targetUserId,
        senderType: 'profile_remind',
        senderId: userId,
      },
      order: { createdAt: 'DESC' },
    })
    if (recentNotify && recentNotify.createdAt > oneDayAgo) {
      return { sent: false }
    }

    // 获取发送方昵称
    const sender = await this.userRepo.findOne({ where: { id: userId } })
    const senderName = sender?.nickname || '一位用户'

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } })
    const taName = targetUser?.nickname || '你'

    // 发送系统通知给目标用户
    const notification = this.notifyRepo.create({
      userId: targetUserId,
      title: `${senderName} 提醒你完善资料`,
      content: `有人查看了${taName}的资料，想为你生成缘分分析，但你的资料完善度不足。完善资料可获得更多曝光和缘分分析机会哦~`,
      senderType: 'profile_remind',
      senderId: userId,
    })
    await this.notifyRepo.save(notification)

    return { sent: true }
  }

  /**
   * 检查今天是否已提醒过对方
   */
  private async hasRemindedToday(fromUserId: number, toUserId: number): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await this.notifyRepo.findOne({
      where: {
        userId: toUserId,
        senderType: 'profile_remind',
        senderId: fromUserId,
      },
      order: { createdAt: 'DESC' },
    })
    return !!(recent && recent.createdAt > oneDayAgo)
  }

  // ==================== 内部方法 ====================

  private async buildUserSnapshot(userId: number): Promise<MatchUserSnapshot> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException(`用户 ${userId} 不存在`)

    const [tags, answers] = await Promise.all([
      this.getSelectedTags(userId),
      this.getApprovedAnswers(userId),
    ])

    return {
      userId: user.id,
      nickname: user.nickname || '',
      gender: user.gender || 0,
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : 0,
      height: user.height || 0,
      weight: user.weight || 0,
      education: user.education || '',
      occupation: user.occupation || '',
      incomeRange: user.incomeRange || '',
      housingStatus: user.housingStatus || '',
      carStatus: user.carStatus || '',
      maritalStatus: user.maritalStatus || '',
      hometown: user.hometown || '',
      residence: user.residence || '',
      zodiac: user.zodiac || '',
      constellation: user.constellation || '',
      tags,
      answers,
    }
  }

  private async getSelectedTags(userId: number): Promise<string[]> {
    const selections = await this.tagSelectionRepo.find({
      where: { userId, isSelected: 1, isDeleted: 0 },
      relations: ['tag'],
    })
    return selections
      .filter((s) => s.tag && s.tag.isEnabled === 1)
      .map((s) => s.tag.name)
  }

  private async getSelectedTagCount(userId: number): Promise<number> {
    return this.tagSelectionRepo.count({
      where: { userId, isSelected: 1, isDeleted: 0 },
    })
  }

  private async getApprovedAnswers(userId: number): Promise<{ question: string; answer: string }[]> {
    const answers = await this.answerRepo.find({
      where: { userId, status: 1 },
      relations: ['question'],
      order: { createdAt: 'DESC' },
    })
    return answers
      .filter((a) => a.question)
      .map((a) => ({
        question: a.question.title || '',
        answer: a.content || '',
      }))
  }

  private async getApprovedAnswerCount(userId: number): Promise<number> {
    return this.answerRepo.count({
      where: { userId, status: 1 },
    })
  }

  private async checkAndIncrementQuota(userId: number): Promise<MatchQuotaInfo> {
    const quota = await this.getQuota(userId)
    // 注意：quota.remaining 是剩余可用次数
    // 此处不减 1，因为实际扣减是在 analyze() 保存 AiCallLog 后由 count 自然体现
    return quota
  }

  private buildResponse(
    report: AiMatchReport,
    fromCache: boolean,
    remainingQuota: number,
  ): MatchReportResponse {
    let advice: string[] = []
    try {
      advice = JSON.parse(report.adviceList || '[]')
    } catch {
      advice = []
    }

    return {
      id: report.id,
      fromCache,
      overallScore: report.overallScore,
      valuesScore: report.valuesScore,
      lifestyleScore: report.lifestyleScore,
      futurePlanScore: report.futurePlanScore,
      analysis: report.analysisText,
      advice,
      overlapTagCount: report.overlapTagCount,
      remainingQuota,
      createdAt: report.createdAt?.toISOString?.() || new Date().toISOString(),
    }
  }

  /**
   * 占位 AI 结果生成器
   * 【实际部署时删除此方法，替换为真实 AI API 调用】
   */
  private buildFallbackResult(
    me: MatchUserSnapshot,
    ta: MatchUserSnapshot,
    overlapTags: string[],
  ): AiMatchResultRaw {
    const overlapScore = Math.min(90, 40 + overlapTags.length * 10)
    const lifestyleMatch =
      me.education === ta.education || me.incomeRange === ta.incomeRange ? 15 : 5
    const planMatch =
      me.maritalStatus === ta.maritalStatus || me.residence === ta.residence ? 15 : 5

    const overallScore = Math.min(95, overlapScore + lifestyleMatch + planMatch)

    const advice = [
      `多聊聊共同的兴趣爱好，比如${overlapTags[0] || '生活中的趣事'}，能让彼此更快了解对方`,
      '建议安排一次轻松的线下见面，选择安静的咖啡馆或公园，在自然的环境中深入交流',
      '彼此尊重对方的生活节奏和空间，保持真诚的沟通频率，感情会在日常点滴中慢慢升温',
    ]

    return {
      overallScore,
      valuesScore: Math.min(95, overlapScore + 5),
      lifestyleScore: Math.min(95, 50 + lifestyleMatch * 2),
      futurePlanScore: Math.min(95, 50 + planMatch * 2),
      analysis:
        `双方在价值观方面有较好的契合度，共同的标签（${overlapTags.join('、') || '兴趣相近'}）为交流提供了丰富的话题基础。` +
        (me.residence === ta.residence
          ? `同在${me.residence}生活，地理上的便利有利于线下了解。`
          : '虽然距离需要克服，但真诚的沟通可以跨越地域。') +
        '建议从共同的兴趣爱好出发，慢慢建立信任和默契。',
      advice,
    }
  }

  /** 解析 AI 返回的 JSON（兼容 markdown code block 包裹） */
  private parseJsonResponse(raw: string): any {
    let json = raw.trim()
    const codeBlock = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlock) json = codeBlock[1]
    return JSON.parse(json)
  }
}
