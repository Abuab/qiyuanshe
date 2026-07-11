import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual } from 'typeorm'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiFeatureKey } from './types'
import { AiSafetyService } from './ai-safety.service'
import { AiQuotaService } from './ai-quota.service'
import { RedisService } from '../common/redis.service'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { beijingISO, beijingDateStr } from '../common/utils/date-utils'
import { AiFunQuizReport } from '../entities/AiFunQuizReport'
import { User } from '../entities/User'
import { buildFunQuizPrompt } from './ai-fun-quiz.prompt'
import { parseJsonResponse } from './ai-common.util'
import {
  FunQuizRequest,
  FunQuizReportResponse,
  FunTimeNode,
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
    private readonly aiApiService: AiApiService,
    private readonly safetyService: AiSafetyService,
    private readonly quotaService: AiQuotaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 生成报告前检查功能开关
   */
  private async checkFeatureEnabled() {
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.FUN_QUIZ)
    if (!enabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI趣味缘分测试暂不可用')
    }
  }

  /**
   * AI 趣味情感问答 —— 生成一道趣味情感题目
   */
  async generateQuestion(): Promise<{ question: string }> {
    await this.checkFeatureEnabled()

    const prompt = `你是一个温暖幽默的情感话题引导者，专门为相亲交友平台设计趣味问答。

请生成一道轻松有趣的恋爱/交友话题题目，要求：
- 话题轻松不尴尬，适合破冰聊天
- 不要涉及性、政治、暴力等敏感内容
- 字数在15-30字之间
- 可以是"如果..."类的假设题、选择偏好题、或者小心理测试

只返回题目文本，不要加任何前缀、编号或额外文字。`

    try {
      const aiResponse = await this.aiApiService.callAndLog({ prompt, responseJson: false }, 0, 'fun_quiz_question')
      const question = aiResponse?.trim() || '如果你和对方第一次约会，你会选择什么地方？'
      return { question }
    } catch (e: any) {
      this.logger.warn(`生成题目失败: ${e?.message}`)
      const fallbackQuestions = [
        '如果你和对方第一次约会，你会选择哪里？',
        '你觉得两个人在一起，最重要的是什么？',
        '如果对方突然送你一份礼物，你希望是什么？',
        '你更喜欢安静地相处还是一起去冒险？',
        '如果要给对方取一个昵称，你会取什么？',
      ]
      return { question: fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)] }
    }
  }

  /**
   * AI 趣味情感问答 —— 响应用户的回答
   * 每日条数限制（会员30/免费5，按北京时间跨天重置）
   */
  async respondToAnswer(
    userId: number,
    isVip: boolean,
    answer: string,
  ): Promise<{ reply: string; remaining: number }> {
    await this.checkFeatureEnabled()

    // 敏感词输入检测
    if (!answer?.trim()) {
      return { reply: '可以多说说你的想法吗？一句话也行～', remaining: 0 }
    }
    const inputCheck = this.safetyService.checkText(answer)
    if (!inputCheck.passed) {
      return { reply: '感谢你的分享～换个轻松的话题聊聊吧！', remaining: 0 }
    }

    // 已登录用户：每日条数限制（按北京时间跨天重置）
    let remaining = 0
    if (userId > 0) {
      const quota = await this.quotaService.getConfig()
      const dailyLimit = isVip && quota.emotionQa.vipPerDay > 0
        ? quota.emotionQa.vipPerDay
        : quota.emotionQa.freePerDay
      const dateKey = beijingDateStr()
      const redisKey = `ai:fun_quiz:answer:${userId}:${dateKey}`
      const count = await this.redis.incr(redisKey)
      if (count === 1) {
        // 首次创建 key，设置为"距下一个北京零点的秒数"过期，与 dateKey 换天边界对齐，
        // 避免 UTC 零点(=北京08:00)提前过期导致当天额度被重置
        const beijingNow = new Date(Date.now() + 8 * 3600 * 1000)
        const secsIntoBeijingDay =
          beijingNow.getUTCHours() * 3600 +
          beijingNow.getUTCMinutes() * 60 +
          beijingNow.getUTCSeconds()
        const ttl = 24 * 3600 - secsIntoBeijingDay + 60 // +60s 缓冲，确保跨过北京零点后旧 key 才过期
        await this.redis.expire(redisKey, ttl)
      }
      remaining = Math.max(0, dailyLimit - count)
      if (count > dailyLimit) {
        throw new BadRequestException({
          code: 'QUOTA_EXCEEDED',
          message: isVip
            ? `今日对话次数已用完（${dailyLimit}条/天），明天再来聊吧～`
            : `今日免费对话次数已用完（${dailyLimit}条/天），开通会员享${quota.emotionQa.vipPerDay}条/天`,
        })
      }
    }

    const prompt = `你是一个经验丰富、风趣幽默的情感教练，正在和一个单身用户进行轻松的交友话题聊天。

【你的身份】你不是冷冰冰的AI，而是一个懂恋爱心理、擅长破冰的情感顾问，语气温暖亲切但不油腻。

【聊天技巧要求】
- 先共情：认可用户的想法或感受（"这个想法很有意思""我能理解你的感觉"）
- 再延伸：基于用户的回答自然延伸，分享一个同类视角或小建议
- 适度幽默：用轻松的比喻或俏皮话增加趣味性，但不过分
- 鼓励表达：引导用户多说一点（追问一个细节或换个角度）
- 保持安全：绝不涉及性、政治、暴力、迷信内容

【对话示例】
用户："我觉得第一次约会去咖啡馆比较好"
好的回复："咖啡馆确实是约会圣地！安静又不会太正式，聊得来可以坐一下午，聊不来喝完就走也不尴尬哈哈。你一般是选安静的角落还是靠窗的位置？"

用户："两个人在一起最重要的是信任"
好的回复："说得很对，信任是感情的基石。不过我觉得信任不是凭空来的，是一点一滴的小事积累起来的。你遇到过让你特别有信任感的人吗？"

用户："我喜欢幽默的人"
好的回复："幽默感是最高级的性感！而且会幽默的人通常情商都不低。你是喜欢那种冷幽默还是热热闹闹的搞笑类型？"

用户刚才回答了一个关于恋爱/交友的话题，内容如下：
"${answer}"

请用自然温暖的口吻回复，像朋友聊天一样，80-150字。
只返回回复文本，不要加任何前缀、编号或角色说明。`

    try {
      const aiResponse = await this.aiApiService.callAndLog({ prompt, responseJson: false }, 0, 'fun_quiz_answer')
      const reply = aiResponse?.trim() || '很有趣的想法呢～每个人对感情的期待都不一样，重要的是找到那个懂你的人。'
      // 输出敏感词检测
      const outputCheck = this.safetyService.checkText(reply)
      if (!outputCheck.passed) {
        return { reply: '感谢你的分享～换个轻松的话题聊聊吧！', remaining }
      }
      return { reply, remaining }
    } catch (e: any) {
      this.logger.warn(`回答响应失败: ${e?.message}`)
      return { reply: '收到你的想法了～要不要换个话题聊聊？', remaining }
    }
  }

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
        message: quota.isFree
          ? `今日趣味测试次数已用完（${quota.limit}/天），开通会员享受${quota.vipLimit}次/天`
          : `今日趣味测试次数已用完（${quota.limit}/天）`,
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
      if (await this.aiApiService.isConfigured()) {
        const aiResponse = await this.aiApiService.callAndLog({ prompt, responseJson: true }, userId, 'fun_quiz')
        rawResult = parseJsonResponse(aiResponse)
      } else {
        rawResult = this.buildFallbackResult(userConstellation, taConstellation)
      }
    } catch (e: any) {
      this.logger.error(`[AI趣味] 调用失败: ${e?.message}，降级使用兜底结果`)
      rawResult = this.buildFallbackResult(userConstellation, taConstellation)
      savedCallLog.responseStatus = 'error'
      await this.callLogRepo.save(savedCallLog).catch(() => {})
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
  async getQuota(userId: number): Promise<{ limit: number; vipLimit: number; isFree: boolean; used: number; remaining: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()
    const quotaConfig = await this.quotaService.getConfig()
    const limit = isVip ? quotaConfig.quiz.vipPerDay : quotaConfig.quiz.freePerDay

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const used = await this.callLogRepo.count({
      where: {
        userId,
        callType: AiCallType.FUN_QUIZ,
        createdAt: MoreThanOrEqual(todayStart),
      },
    })

    return { limit, vipLimit: quotaConfig.quiz.vipPerDay, isFree: !isVip, used, remaining: Math.max(0, limit - used) }
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
      createdAt: report.createdAt ? beijingISO(report.createdAt) : beijingISO(),
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
