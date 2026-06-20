import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiFeatureKey } from './types'
import { AiSafetyService } from './ai-safety.service'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { AiUserProfile, ProfileStatus } from '../entities/AiUserProfile'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { buildProfileGenPrompt } from './ai-profile-gen.prompt'
import {
  ProfileGenEligibility,
  ProfileGenResponse,
  PROFILE_GEN_FREE_MONTHLY_LIMIT,
  PROFILE_GEN_VIP_MONTHLY_LIMIT,
  PROFILE_GEN_MIN_TAGS,
  PROFILE_GEN_MIN_ANSWERS,
  PROFILE_GEN_QUOTA_KEY,
} from './ai-profile-gen.types'

@Injectable()
export class AiProfileGenService {
  private readonly logger = new Logger(AiProfileGenService.name)

  constructor(
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(AiUserProfile)
    private readonly profileRepo: Repository<AiUserProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserTagSelection)
    private readonly tagSelectionRepo: Repository<UserTagSelection>,
    @InjectRepository(QuestionAnswer)
    private readonly answerRepo: Repository<QuestionAnswer>,
    private readonly redis: RedisService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiApiService: AiApiService,
    private readonly safetyService: AiSafetyService,
  ) {}

  /**
   * 检查是否满足画像生成条件
   */
  async checkEligibility(userId: number): Promise<ProfileGenEligibility> {
    const [tagCount, answerCount] = await Promise.all([
      this.tagSelectionRepo.count({
        where: { userId, isSelected: 1, isDeleted: 0 },
      }),
      this.answerRepo.count({
        where: { userId, status: 1 },
      }),
    ])

    const reasons: string[] = []
    if (tagCount < PROFILE_GEN_MIN_TAGS) {
      reasons.push(`标签不足${PROFILE_GEN_MIN_TAGS}个，请完善个人标签`)
    }
    if (answerCount < PROFILE_GEN_MIN_ANSWERS) {
      reasons.push(`审核通过的问答不足${PROFILE_GEN_MIN_ANSWERS}条，请回答更多问题`)
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      tagCount,
      answerCount,
    }
  }

  /**
   * 生成/刷新 AI 个人画像
   */
  async generate(userId: number, force = false): Promise<ProfileGenResponse> {
    // 1. 校验开关
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.PROFILE_GEN)
    if (!enabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI个人印象生成暂不可用')
    }

    // 2. 资料完备校验
    const eligibility = await this.checkEligibility(userId)
    if (!eligibility.eligible) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_DATA',
        message: '完善资料后解锁AI印象',
        reasons: eligibility.reasons,
      })
    }

    // 3. 校验次数限制（非强制刷新）
    if (!force) {
      const quota = await this.checkAndGetQuota(userId)
      if (quota.remaining <= 0) {
        throw new BadRequestException({
          code: 'QUOTA_EXCEEDED',
          message: quota.limit === PROFILE_GEN_FREE_MONTHLY_LIMIT
            ? `本月AI印象刷新次数已用完（${PROFILE_GEN_FREE_MONTHLY_LIMIT}/月），开通会员享受${PROFILE_GEN_VIP_MONTHLY_LIMIT}次/月`
            : `本月AI印象刷新次数已用完（${PROFILE_GEN_VIP_MONTHLY_LIMIT}/月）`,
        })
      }
    }

    // 4. 收集数据
    const [user, tags, answers] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.getSelectedTagNames(userId),
      this.getApprovedAnswers(userId),
    ])
    if (!user) throw new BadRequestException('用户不存在')

    // 5. 构建 Prompt
    const prompt = buildProfileGenPrompt({
      nickname: user.nickname || '',
      gender: user.gender === 1 ? '男' : '女',
      age: user.birthYear ? new Date().getFullYear() - user.birthYear : 0,
      tags,
      answers,
    })

    // 6. 创建 AI 调用日志
    const callLog = this.callLogRepo.create({
      userId,
      callType: AiCallType.PROFILE_GEN,
      consumeCount: 1,
      responseStatus: 'success',
      requestSummary: JSON.stringify({
        tagCount: tags.length,
        answerCount: answers.length,
        promptLength: prompt.length,
      }),
    })
    const savedCallLog = await this.callLogRepo.save(callLog)

    // 7. 调用 AI
    const startMs = Date.now()
    let rawResult: { summary: string; content: string }

    try {
      if (this.aiApiService.isConfigured()) {
        const aiResponse = await this.aiApiService.call({ prompt, responseJson: true })
        rawResult = this.parseJsonResponse(aiResponse)
      } else {
        rawResult = this.buildFallbackProfile(user.nickname, tags, answers)
      }
    } catch (e: any) {
      this.logger.warn(`AI profile gen call failed: ${e?.message}, using fallback`)
      rawResult = this.buildFallbackProfile(user.nickname, tags, answers)
      savedCallLog.responseStatus = 'error'
      await this.callLogRepo.save(savedCallLog)
      throw new BadRequestException('AI服务暂时不可用，请稍后重试')
    }

    savedCallLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(savedCallLog)

    // 8. 安全过滤 + 审计入库
    const safetyResult = this.safetyService.checkText(rawResult.summary + rawResult.content)
    if (!safetyResult.passed) {
      rawResult.summary = '阳光真诚，期待遇见有缘人'
      rawResult.content = '我是一个热爱生活、真诚友善的人，希望能遇到志趣相投的另一半，一起分享生活的美好。'
    }

    await this.safetyService.checkAndAudit(
      JSON.stringify(rawResult),
      savedCallLog.id,
    )

    // 9. 保存/更新画像
    let profile = await this.profileRepo.findOne({
      where: { userId, isDeleted: 0 },
    })

    if (profile) {
      profile.summary = rawResult.summary
      profile.content = rawResult.content
      profile.answerCount = answers.length
      profile.tagCount = tags.length
      profile.version = (profile.version || 0) + 1
      profile.status = ProfileStatus.NORMAL
      profile.generationMs = Date.now() - startMs
    } else {
      profile = this.profileRepo.create({
        userId,
        summary: rawResult.summary,
        content: rawResult.content,
        answerCount: answers.length,
        tagCount: tags.length,
        version: 1,
        status: ProfileStatus.NORMAL,
        generationMs: Date.now() - startMs,
      })
    }
    const saved = await this.profileRepo.save(profile)

    // 10. 更新配额（非强制刷新时）
    if (!force) {
      await this.incrementQuota(userId)
    }

    const quotaInfo = await this.checkAndGetQuota(userId)

    return {
      id: saved.id,
      summary: saved.summary || '',
      content: saved.content || '',
      tagCount: saved.tagCount,
      answerCount: saved.answerCount,
      version: saved.version,
      remainingQuota: Math.max(0, quotaInfo.remaining),
      createdAt: saved.createdAt?.toISOString?.() || new Date().toISOString(),
    }
  }

  /**
   * 获取用户当前画像
   */
  async getProfile(userId: number): Promise<ProfileGenResponse | null> {
    const profile = await this.profileRepo.findOne({
      where: { userId, status: ProfileStatus.NORMAL, isDeleted: 0 },
    })
    if (!profile) return null

    const quota = await this.checkAndGetQuota(userId)

    return {
      id: profile.id,
      summary: profile.summary || '',
      content: profile.content || '',
      tagCount: profile.tagCount,
      answerCount: profile.answerCount,
      version: profile.version,
      remainingQuota: quota.remaining,
      createdAt: profile.createdAt?.toISOString?.() || new Date().toISOString(),
    }
  }

  /** 管理员下架画像 */
  async removeProfile(
    userId: number,
    reason: string,
    operatorId: number,
  ): Promise<void> {
    const profile = await this.profileRepo.findOne({
      where: { userId, isDeleted: 0 },
    })
    if (!profile) throw new BadRequestException('画像不存在')

    profile.status = ProfileStatus.REMOVED
    profile.removeReason = reason
    profile.removedBy = operatorId
    profile.removedAt = new Date()
    await this.profileRepo.save(profile)

    this.logger.log(`Profile removed for user ${userId} by operator ${operatorId}: ${reason}`)
  }

  /** 获取本月剩余配额 */
  async getQuota(userId: number): Promise<{ limit: number; used: number; remaining: number }> {
    return this.checkAndGetQuota(userId)
  }

  // ==================== 内部方法 ====================

  private async getSelectedTagNames(userId: number): Promise<string[]> {
    const selections = await this.tagSelectionRepo.find({
      where: { userId, isSelected: 1, isDeleted: 0 },
      relations: ['tag'],
    })
    return selections
      .filter((s) => s.tag && s.tag.isEnabled === 1)
      .map((s) => s.tag.name)
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

  /**
   * 按月配额：Redis key = ai:profile-gen:quota:{userId}:{YYYY-MM}
   */
  private async checkAndGetQuota(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()
    const limit = isVip ? PROFILE_GEN_VIP_MONTHLY_LIMIT : PROFILE_GEN_FREE_MONTHLY_LIMIT

    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const key = `${PROFILE_GEN_QUOTA_KEY}${userId}:${yearMonth}`

    const usedStr = await this.redis.get(key)
    const used = parseInt(usedStr || '0', 10)

    return { limit, used, remaining: Math.max(0, limit - used) }
  }

  private async incrementQuota(userId: number): Promise<void> {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const key = `${PROFILE_GEN_QUOTA_KEY}${userId}:${yearMonth}`

    await this.redis.incr(key)

    // 首次设置过期（下月初）
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const ttl = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000)
    await this.redis.expire(key, ttl)
  }

  private buildFallbackProfile(
    nickname: string,
    tags: string[],
    answers: { question: string; answer: string }[],
  ): { summary: string; content: string } {
    const tagSummary = tags.slice(0, 3).join('、') || '热爱生活'
    const summary = `热爱${tagSummary}的真诚伙伴，期待遇见有缘人`

    const tagPart = tags.length > 0
      ? `我热爱${tags.slice(0, 4).join('、')}，这些让我的生活丰富多彩。`
      : '我热爱生活，对每一天都充满期待。'

    const answerPart = answers.length > 0
      ? `朋友们说我${answers[0]?.answer?.slice(0, 20) || '真诚友善'}，我也相信真正的缘分需要用心经营。`
      : '我相信真诚是最好的沟通方式，期待遇见志趣相投的你。'

    return {
      summary,
      content: `大家好，我是${nickname || '新朋友'}~ ${tagPart} ${answerPart}希望能遇到一个同样热爱生活、愿意一起分享美好时光的人，一起创造属于我们的故事。`,
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
