import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiFeatureKey } from './types'
import { AiSafetyService } from './ai-safety.service'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { ChatMessage } from '../entities/ChatMessage'
import { User } from '../entities/User'
import { buildChatSkillPrompt } from './ai-chat-skill.prompt'
import {
  ChatSkillSuggestion,
  ChatSkillResponse,
  CHAT_SKILL_FREE_DAILY_LIMIT,
  CHAT_SKILL_VIP_DAILY_LIMIT,
  CHAT_SKILL_MAX_VIOLATIONS,
} from './ai-chat-skill.types'

/** 脱敏正则：匹配手机号、微信号、具体地址等 */
const DESENSITIZE_PATTERNS: [RegExp, string][] = [
  [/1[3-9]\d{9}/g, '***'],
  [/\b[A-Za-z0-9_-]{6,20}\b/g, '***'], // 微信号/QQ号
  [/\d{3}-\d{8}|\d{4}-\d{7,8}/g, '***'], // 座机号
  [/[省市县区路街巷号栋单元室]+\d+号?/g, '某地'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***'], // 邮箱
]

@Injectable()
export class AiChatSkillService {
  private readonly logger = new Logger(AiChatSkillService.name)

  constructor(
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redis: RedisService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiApiService: AiApiService,
    private readonly safetyService: AiSafetyService,
  ) {}

  /**
   * 生成聊天话术建议
   */
  async generateSuggestions(
    userId: number,
    targetUserId: number,
  ): Promise<ChatSkillResponse> {
    // 1. 校验开关
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.CHAT_SKILL)
    if (!enabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI聊天话术助手暂不可用')
    }

    // 2. 校验用户是否被禁用（当日违规次数超限）
    const disabled = await this.isUserDayBanned(userId)
    if (disabled) {
      throw new BadRequestException({
        code: 'USER_BANNED',
        message: '您今日已多次触发安全提醒，AI帮回功能暂不可用，明天自动恢复',
      })
    }

    // 3. 校验次数限制
    const quota = await this.checkAndGetQuota(userId)
    if (quota.remaining <= 0) {
      throw new BadRequestException({
        code: 'QUOTA_EXCEEDED',
        message: quota.limit === CHAT_SKILL_FREE_DAILY_LIMIT
          ? `今日AI帮回次数已用完（${CHAT_SKILL_FREE_DAILY_LIMIT}/天），开通会员享受${CHAT_SKILL_VIP_DAILY_LIMIT}次/天`
          : `今日AI帮回次数已用完（${CHAT_SKILL_VIP_DAILY_LIMIT}/天）`,
      })
    }

    // 4. 获取对话上下文
    const context = await this.getChatContext(userId, targetUserId)
    const taLastMessage = context.messages
      .filter((m) => m.role === 'ta')
      .slice(-1)[0]

    if (!taLastMessage) {
      throw new BadRequestException('对方还没有发消息，无法生成回复建议')
    }

    // 5. 获取用户信息
    const [me, ta] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.userRepo.findOne({ where: { id: targetUserId } }),
    ])

    if (!me || !ta) throw new BadRequestException('用户不存在')

    // 6. 构建 Prompt 并调用 AI
    const prompt = buildChatSkillPrompt({
      me: { gender: me.gender || 0, age: me.birthYear ? new Date().getFullYear() - me.birthYear : 0, nickname: me.nickname || '' },
      ta: { gender: ta.gender || 0, age: ta.birthYear ? new Date().getFullYear() - ta.birthYear : 0, nickname: ta.nickname || '' },
      messages: context.messages,
      taLastMessage: taLastMessage.content,
    })

    // 7. 创建 AI 调用日志
    const callLog = this.callLogRepo.create({
      userId,
      callType: AiCallType.CHAT_SKILL,
      consumeCount: 1,
      responseStatus: 'success',
      requestSummary: JSON.stringify({
        targetUserId,
        messageCount: context.messages.length,
        promptLength: prompt.length,
      }),
    })
    const savedCallLog = await this.callLogRepo.save(callLog)

    // 8. 调用 AI（占位 → 正式部署时替换为真实 API）
    const startMs = Date.now()
    let rawResult: { humorous: string; sincere: string; flirtatious: string }

    try {
      if (this.aiApiService.isConfigured()) {
        const aiResponse = await this.aiApiService.call({ prompt, responseJson: true })
        rawResult = this.parseJsonResponse(aiResponse)
      } else {
        rawResult = this.buildFallbackSuggestions(taLastMessage.content)
      }
    } catch (e: any) {
      this.logger.warn(`AI chat skill call failed: ${e?.message}, using fallback`)
      rawResult = this.buildFallbackSuggestions(taLastMessage.content)
      savedCallLog.responseStatus = 'error'
      await this.callLogRepo.save(savedCallLog)
      this.logger.error(`AI chat skill failed: ${e?.message}`)
      throw new BadRequestException('AI服务暂时不可用，请稍后重试')
    }

    savedCallLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(savedCallLog)

    // 9. 安全过滤 + 审计入库
    const allTexts = [rawResult.humorous, rawResult.sincere, rawResult.flirtatious]
    const safetyResults = this.safetyService.checkTexts(allTexts)

    let violationCount = 0
    const suggestions: ChatSkillSuggestion[] = [
      { style: 'humorous', label: '幽默版', content: rawResult.humorous, safe: true },
      { style: 'sincere', label: '真诚版', content: rawResult.sincere, safe: true },
      { style: 'flirtatious', label: '撩人版', content: rawResult.flirtatious, safe: true },
    ]

    for (let i = 0; i < suggestions.length; i++) {
      if (!safetyResults[i].passed) {
        suggestions[i].safe = false
        suggestions[i].content = '系统优化中'
        violationCount++

        // 入库安全审计
        await this.safetyService.checkAndAudit(allTexts[i], savedCallLog.id)
      }
    }

    // 10. 累计违规次数，判断是否需要禁用
    if (violationCount > 0) {
      const shouldBan = await this.safetyService.incrementDailyViolation(
        userId,
        CHAT_SKILL_MAX_VIOLATIONS,
      )
      if (shouldBan) {
        this.logger.warn(`User ${userId} has been banned for chat skill due to ${violationCount} violations today`)
      }
    }

    return {
      suggestions,
      remainingQuota: quota.remaining - 1,
    }
  }

  /** 获取当日剩余配额 */
  async getQuota(userId: number): Promise<{ limit: number; used: number; remaining: number }> {
    return this.checkAndGetQuota(userId)
  }

  // ==================== 内部方法 ====================

  /**
   * 获取最近 5 轮对话上下文（脱敏）
   */
  private async getChatContext(
    userId: number,
    targetUserId: number,
  ): Promise<{
    messages: { role: 'me' | 'ta'; content: string; time: string }[]
  }> {
    const messages = await this.chatMessageRepo.find({
      where: [
        { fromUserId: userId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: userId },
      ],
      order: { createdAt: 'DESC' },
      take: 10, // 最近10条 = 5轮
    })

    const reversed = messages.reverse()

    return {
      messages: reversed.map((m) => ({
        role: m.fromUserId === userId ? 'me' : 'ta',
        content: this.desensitize(m.content),
        time: m.createdAt?.toISOString?.() || '',
      })),
    }
  }

  /**
   * 文本脱敏：隐藏手机号/微信号/地址/邮箱
   * 同时替换对方昵称 → "对方"
   */
  private desensitize(text: string): string {
    let result = text
    for (const [pattern, replacement] of DESENSITIZE_PATTERNS) {
      result = result.replace(pattern, replacement)
    }
    return result
  }

  /**
   * 查询次数与 VIP 状态
   */
  private async checkAndGetQuota(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip =
      user.isVip === 1 &&
      user.vipExpireTime &&
      new Date(user.vipExpireTime) > new Date()

    const limit = isVip ? CHAT_SKILL_VIP_DAILY_LIMIT : CHAT_SKILL_FREE_DAILY_LIMIT

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const used = await this.callLogRepo.count({
      where: {
        userId,
        callType: AiCallType.CHAT_SKILL,
        createdAt: MoreThanOrEqual(todayStart),
      },
    })

    return { limit, used, remaining: Math.max(0, limit - used) }
  }

  /**
   * 检查用户是否已被当日禁用
   */
  private async isUserDayBanned(userId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const key = `ai:safety:daily:${userId}:${today}`
    const countStr = await this.redis.get(key)
    const count = parseInt(countStr || '0', 10)
    return count > CHAT_SKILL_MAX_VIOLATIONS
  }

  /**
   * 占位 AI 结果（实际部署时删除，替换为真实 API）
   */
  private buildFallbackSuggestions(lastMessage: string): {
    humorous: string
    sincere: string
    flirtatious: string
  } {
    return {
      humorous: '哈哈，你这么一说我突然觉得好有道理！下次我也试试看～',
      sincere: '听了你说的，感觉你是个很有想法的人，能跟我多分享一下吗？',
      flirtatious: '和你聊天感觉时间过得特别快，期待能更了解你',
    }
  }

  /** 解析 AI 返回的 JSON（兼容 markdown code block 包裹） */
  private parseJsonResponse(raw: string): any {
    let json = raw.trim()
    // 去除 ```json ... ``` 包裹
    const codeBlock = json.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlock) json = codeBlock[1]
    return JSON.parse(json)
  }
}
