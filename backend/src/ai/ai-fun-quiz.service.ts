import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiConfigService } from './ai-config.service'
import { AiFeatureKey } from './types'
import { AiSafetyService } from './ai-safety.service'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { AiFunQuizReport } from '../entities/AiFunQuizReport'
import { User } from '../entities/User'
import { buildFunQuizPrompt } from './ai-fun-quiz.prompt'
import {
  FunQuizRequest,
  FunQuizReportResponse,
  FunTimeNode,
  FUN_QUIZ_FREE_DAILY_LIMIT,
  FUN_QUIZ_VIP_DAILY_LIMIT,
  FUN_QUIZ_CACHE_DAYS,
  calcConstellation,
  calcZodiac,
  getConstellationDateRange,
} from './ai-fun-quiz.types'

/** 禁止出现的迷信词汇（AI 输出后将再次过滤） */
const FORBIDDEN_OCCULT_WORDS = [
  '算命', '八字', '命理', '吉凶', '改运', '风水',
  '占卜', '运势', '卦象', '面相', '手相',
]

@Injectable()
export class AiFunQuizService {
  private readonly logger = new Logger(AiFunQuizService.name)

  constructor(
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(AiFunQuizReport)
    private readonly quizReportRepo: Repository<AiFunQuizReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly aiConfigService: AiConfigService,
    private readonly safetyService: AiSafetyService,
  ) {}

  /**
   * 生成缘分密码报告
   */
  async generateReport(
    userId: number,
    input: FunQuizRequest,
  ): Promise<FunQuizReportResponse> {
    // 1. 校验开关
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.FUN_QUIZ)
    if (!enabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI趣味缘分测试暂不可用')
    }

    // 2. 参数校验
    if (!input.userBirthDay || !input.taBirthDay) {
      throw new BadRequestException('请输入双方的出生日期')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.userBirthDay) || !/^\d{4}-\d{2}-\d{2}$/.test(input.taBirthDay)) {
      throw new BadRequestException('出生日期格式不正确，请使用 YYYY-MM-DD')
    }

    const userDate = new Date(input.userBirthDay)
    const taDate = new Date(input.taBirthDay)
    if (isNaN(userDate.getTime()) || isNaN(taDate.getTime())) {
      throw new BadRequestException('出生日期无效')
    }

    // 预计算星座和生肖
    const userConstellation = calcConstellation(userDate.getMonth() + 1, userDate.getDate())
    const taConstellation = calcConstellation(taDate.getMonth() + 1, taDate.getDate())
    const userZodiac = calcZodiac(userDate.getFullYear())
    const taZodiac = calcZodiac(taDate.getFullYear())

    // 3. 查缓存（相同生日组合 7 天内返回）
    const cached = await this.quizReportRepo.findOne({
      where: {
        userBirthDay: input.userBirthDay,
        taBirthDay: input.taBirthDay,
        isDeleted: 0,
      },
      order: { createdAt: 'DESC' },
    })
    if (cached) {
      const ageMs = Date.now() - new Date(cached.createdAt).getTime()
      if (ageMs < FUN_QUIZ_CACHE_DAYS * 24 * 60 * 60 * 1000) {
        const quota = await this.getQuota(userId)
        return this.buildResponse(cached, true, quota.remaining)
      }
    }

    // 4. 校验次数限制
    const quota = await this.getQuota(userId)
    if (quota.remaining <= 0) {
      throw new BadRequestException({
        code: 'QUOTA_EXCEEDED',
        message: quota.limit === FUN_QUIZ_FREE_DAILY_LIMIT
          ? `今日趣味测试次数已用完（${FUN_QUIZ_FREE_DAILY_LIMIT}/天），开通会员享受${FUN_QUIZ_VIP_DAILY_LIMIT}次/天`
          : `今日趣味测试次数已用完（${FUN_QUIZ_VIP_DAILY_LIMIT}/天）`,
      })
    }

    // 5. 构建 Prompt
    const user = await this.userRepo.findOne({ where: { id: userId } })
    const userAge = user?.birthYear ? new Date().getFullYear() - user.birthYear : 0

    const prompt = buildFunQuizPrompt({
      userZodiac,
      taZodiac,
      userConstellation,
      taConstellation,
      userConstDate: getConstellationDateRange(userConstellation),
      taConstDate: getConstellationDateRange(taConstellation),
      userAge,
      taAge: 0, // 未知对方年龄
    })

    // 6. 创建 AI 调用日志
    const callLog = this.callLogRepo.create({
      userId,
      callType: AiCallType.FUN_QUIZ,
      consumeCount: 1,
      responseStatus: 'success',
      requestSummary: JSON.stringify({
        userBirthDay: input.userBirthDay,
        taBirthDay: input.taBirthDay,
        promptLength: prompt.length,
      }),
    })
    const savedCallLog = await this.callLogRepo.save(callLog)

    // 7. 调用 AI（占位 → 正式部署替换为真实 API）
    const startMs = Date.now()
    let rawResult: {
      personalityAnalysis: string
      relationshipAdvice: string
      timeNodes: FunTimeNode[]
      keywords: string[]
    }

    try {
      // const aiResponse = await this.callAiModel(prompt)
      // rawResult = JSON.parse(aiResponse)
      rawResult = this.buildFallbackResult(userConstellation, taConstellation)
    } catch (e: any) {
      savedCallLog.responseStatus = 'error'
      await this.callLogRepo.save(savedCallLog)
      throw new BadRequestException('AI服务暂时不可用，请稍后重试')
    }

    savedCallLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(savedCallLog)

    // 8. 安全过滤
    const { personalityAnalysis, relationshipAdvice } = this.sanitizeOutput(rawResult)

    // 9. 全部内容入库安全审计
    const allContent = JSON.stringify(rawResult)
    await this.safetyService.checkAndAudit(allContent, savedCallLog.id)

    // 10. 保存报告
    const report = this.quizReportRepo.create({
      userId,
      userBirthDay: input.userBirthDay,
      taBirthDay: input.taBirthDay,
      userBirthHour: input.userBirthHour || null,
      taBirthHour: input.taBirthHour || null,
      userZodiac,
      taZodiac,
      userConstellation,
      taConstellation,
      personalityAnalysis,
      relationshipAdvice,
      timeNodes: JSON.stringify(rawResult.timeNodes),
      keywords: JSON.stringify(rawResult.keywords),
      generationMs: Date.now() - startMs,
      aiCallLogId: savedCallLog.id,
    })
    await this.quizReportRepo.save(report)

    return this.buildResponse(report, false, quota.remaining - 1)
  }

  /** 获取今日剩余配额 */
  async getQuota(userId: number): Promise<{ limit: number; used: number; remaining: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()
    const limit = isVip ? FUN_QUIZ_VIP_DAILY_LIMIT : FUN_QUIZ_FREE_DAILY_LIMIT

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const used = await this.callLogRepo.count({
      where: {
        userId,
        callType: AiCallType.FUN_QUIZ,
        createdAt: { $gte: todayStart } as any,
      },
    })

    return { limit, used, remaining: Math.max(0, limit - used) }
  }

  // ==================== 内部方法 ====================

  /**
   * 输出合规清洗：
   * - 去除被禁止的迷信词汇
   * - 敏感词检测，命中则替换为合规短语
   */
  private sanitizeOutput(raw: {
    personalityAnalysis: string
    relationshipAdvice: string
    timeNodes: FunTimeNode[]
    keywords: string[]
  }) {
    let personalityAnalysis = raw.personalityAnalysis || ''
    let relationshipAdvice = raw.relationshipAdvice || ''

    // 替换封建迷信词汇
    for (const word of FORBIDDEN_OCCULT_WORDS) {
      const regex = new RegExp(word, 'g')
      personalityAnalysis = personalityAnalysis.replace(regex, '趣味分析')
      relationshipAdvice = relationshipAdvice.replace(regex, '趣味建议')
    }

    // 敏感词检测
    const paResult = this.safetyService.checkText(personalityAnalysis)
    if (!paResult.passed) personalityAnalysis = '从星座和生肖来看，你们性格互补，相处起来会很有默契感。具体的相处模式还需要在实际交往中慢慢体会~'

    const raResult = this.safetyService.checkText(relationshipAdvice)
    if (!raResult.passed) relationshipAdvice = '建议多沟通、多理解、多包容，用心经营你们的感情，相信会有美好的未来。'

    return { personalityAnalysis, relationshipAdvice }
  }

  private buildResponse(
    report: AiFunQuizReport,
    fromCache: boolean,
    remainingQuota: number,
  ): FunQuizReportResponse {
    let timeNodes: FunTimeNode[] = []
    let keywords: string[] = []
    try { timeNodes = JSON.parse(report.timeNodes || '[]') } catch {}
    try { keywords = JSON.parse(report.keywords || '[]') } catch {}

    return {
      id: report.id,
      fromCache,
      userConstellation: report.userConstellation,
      taConstellation: report.taConstellation,
      userZodiac: report.userZodiac,
      taZodiac: report.taZodiac,
      personalityAnalysis: report.personalityAnalysis,
      relationshipAdvice: report.relationshipAdvice,
      timeNodes,
      keywords,
      remainingQuota,
      createdAt: report.createdAt?.toISOString?.() || new Date().toISOString(),
    }
  }

  private buildFallbackResult(userConst: string, taConst: string) {
    return {
      personalityAnalysis: `${userConst}热情大方，${taConst}温和细腻，你们是典型的互补组合。一个主动一个体贴，生活中总能擦出不一样的火花，保持这种节奏，你们的相处会越来越默契～`,
      relationshipAdvice: `建议一起培养共同的兴趣爱好，比如周末郊游或一起学做新菜。${userConst}可以多倾听${taConst}的想法，${taConst}也可以偶尔主动安排一些惊喜，彼此都能感受到对方的用心～`,
      timeNodes: [
        { day: '第1个月', title: '新鲜期', desc: '彼此充满好奇，觉得对方哪里都特别' },
        { day: '第100天', title: '磨合期', desc: '开始习惯彼此的小脾气，越吵越了解' },
        { day: '半年后', title: '稳定期', desc: '默契十足，一个眼神就知道对方在想什么' },
      ],
      keywords: ['互补型', '慢热配主动', '天作之合'],
    }
  }
}
