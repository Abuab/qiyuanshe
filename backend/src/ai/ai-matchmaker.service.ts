import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiFeatureKey } from './types'
import { AiSafetyService } from './ai-safety.service'
import { AiCallLog, AiCallType } from '../entities/AiCallLog'
import { User } from '../entities/User'
import {
  MATCHMAKER_SYSTEM_PROMPT,
  buildMatchmakerChatPrompt,
  checkSafetyBoundary,
} from './ai-matchmaker.prompt'
import {
  MatchmakerMessage,
  MatchmakerChatResponse,
  QUICK_QUESTIONS,
  MATCHMAKER_FREE_DAILY_ROUNDS,
} from './ai-matchmaker.types'

/** Redis 对话上下文 key 前缀 */
const CONTEXT_KEY_PREFIX = 'ai:matchmaker:ctx:'
/** 每个会话保存最近消息数 */
const MAX_CONTEXT_MESSAGES = 20
/** 上下文过期时间（秒）= 24小时 */
const CONTEXT_TTL = 86400

@Injectable()
export class AiMatchmakerService {
  private readonly logger = new Logger(AiMatchmakerService.name)

  constructor(
    @InjectRepository(AiCallLog)
    private readonly callLogRepo: Repository<AiCallLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redis: RedisService,
    private readonly aiConfigService: AiConfigService,
    private readonly aiApiService: AiApiService,
    private readonly safetyService: AiSafetyService,
  ) {}

  /**
   * 发送消息给 AI 红娘
   */
  async chat(userId: number, message: string): Promise<MatchmakerChatResponse> {
    // 1. 校验开关
    const enabled = await this.aiConfigService.isFeatureEnabled(AiFeatureKey.MATCHMAKER)
    if (!enabled) {
      throw new BadRequestException('AI_FEATURE_DISABLED:AI红娘机器人暂不可用')
    }

    if (!message?.trim()) {
      throw new BadRequestException('请输入您的问题')
    }

    // 2. 安全边界检查 → 输入拦截
    const boundaryNotice = checkSafetyBoundary(message)
    if (boundaryNotice) {
      return {
        reply: boundaryNotice,
        safetyNotice: 'safety_boundary',
        remainingRounds: null,
      }
    }

    // 3. 敏感词检查 → 输入拦截
    const inputCheck = this.safetyService.checkText(message)
    if (!inputCheck.passed) {
      return {
        reply: '请保持文明交流。栖缘社是一个真诚、健康的婚恋交友平台，我们应该相互尊重',
        safetyNotice: 'input_violation',
        remainingRounds: null,
      }
    }

    // 4. 校验次数限制（仅免费用户）
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()

    let remainingRounds: number | null = null
    if (!isVip) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const usedToday = await this.callLogRepo.count({
        where: {
          userId,
          callType: AiCallType.MATCHMAKER,
          createdAt: MoreThanOrEqual(todayStart),
        },
      })

      remainingRounds = Math.max(0, MATCHMAKER_FREE_DAILY_ROUNDS - usedToday)
      if (remainingRounds <= 0) {
        throw new BadRequestException({
          code: 'QUOTA_EXCEEDED',
          message: `今日免费咨询次数已用完（${MATCHMAKER_FREE_DAILY_ROUNDS}轮/天），开通会员享无限次红娘咨询`,
        })
      }
    }

    // 5. 获取对话历史
    const history = await this.getContext(userId)

    // 6. 构建 Prompt
    const fullPrompt = buildMatchmakerChatPrompt(history, message)

    // 7. 记录调用日志
    const callLog = this.callLogRepo.create({
      userId,
      callType: AiCallType.MATCHMAKER,
      consumeCount: 1,
      responseStatus: 'success',
      requestSummary: JSON.stringify({
        messageLength: message.length,
        historyRounds: history.length,
      }),
    })
    const savedCallLog = await this.callLogRepo.save(callLog)

    // 8. 调用 AI
    const startMs = Date.now()
    let reply: string

    try {
      if (await this.aiApiService.isConfigured()) {
        reply = await this.aiApiService.call({
          messages: [
            { role: 'system', content: MATCHMAKER_SYSTEM_PROMPT },
            ...history.map(h => ({ role: (h.role === 'ai' ? 'assistant' : h.role) as 'system' | 'user' | 'assistant', content: h.content })),
            { role: 'user', content: message },
          ],
          maxTokens: 300,
          temperature: 0.8,
        })
      } else {
        reply = this.buildFallbackReply(message)
      }
    } catch (e: any) {
      this.logger.warn(`AI matchmaker call failed: ${e?.message}, using fallback`)
      reply = this.buildFallbackReply(message)
      savedCallLog.responseStatus = 'error'
      await this.callLogRepo.save(savedCallLog)
      this.logger.error(`AI matchmaker failed for user ${userId}: ${e?.message}`)
      throw new BadRequestException('红娘正在忙，请稍后再试')
    }

    savedCallLog.responseMs = Date.now() - startMs
    await this.callLogRepo.save(savedCallLog)

    // 9. 输出敏感词安全审计
    const outputCheck = await this.safetyService.checkAndAudit(reply, savedCallLog.id)
    if (!outputCheck.passed) {
      reply = '感谢您的咨询，我会继续努力为您提供更好的服务'
    }

    // 10. 保存上下文
    await this.saveContext(userId, { role: 'user', content: message }, { role: 'ai', content: reply })

    return {
      reply,
      remainingRounds: isVip ? null : Math.max(0, remainingRounds! - 1),
    }
  }

  /**
   * 获取对话历史
   */
  async getHistory(
    userId: number,
  ): Promise<{ messages: MatchmakerMessage[]; remainingRounds: number | null }> {
    const messages = await this.getContext(userId)

    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new BadRequestException('用户不存在')

    const isVip = user.isVip === 1 && user.vipExpireTime && new Date(user.vipExpireTime) > new Date()

    let remainingRounds: number | null = null
    if (!isVip) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const used = await this.callLogRepo.count({
        where: {
          userId,
          callType: AiCallType.MATCHMAKER,
          createdAt: MoreThanOrEqual(todayStart),
        },
      })
      remainingRounds = Math.max(0, MATCHMAKER_FREE_DAILY_ROUNDS - used)
    }

    return {
      messages: messages.map((m, i) => ({
        role: m.role as 'user' | 'ai',
        content: m.content,
        createdAt: new Date().toISOString(),
      })),
      remainingRounds,
    }
  }

  /**
   * 获取快捷问题列表
   */
  getQuickQuestions(): string[] {
    return QUICK_QUESTIONS
  }

  /**
   * 清除某用户的对话上下文
   */
  async clearContext(userId: number): Promise<void> {
    const key = `${CONTEXT_KEY_PREFIX}${userId}`
    await this.redis.del(key)
  }

  // ==================== 内部方法 ====================

  private getContextKey(userId: number): string {
    return `${CONTEXT_KEY_PREFIX}${userId}`
  }

  private async getContext(
    userId: number,
  ): Promise<{ role: 'user' | 'ai'; content: string }[]> {
    const key = this.getContextKey(userId)
    const raw = await this.redis.get(key)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }

  private async saveContext(
    userId: number,
    userMsg: { role: 'user'; content: string },
    aiMsg: { role: 'ai'; content: string },
  ): Promise<void> {
    const key = this.getContextKey(userId)
    const context = await this.getContext(userId)
    context.push(userMsg, aiMsg)

    // 保留最近 N 条
    const trimmed = context.slice(-MAX_CONTEXT_MESSAGES)

    await this.redis.set(key, JSON.stringify(trimmed), CONTEXT_TTL)
  }

  /**
   * 占位 AI 回复（正式部署时删除）
   */
  private buildFallbackReply(message: string): string {
    const msg = message.toLowerCase()

    if (msg.includes('约会') && (msg.includes('去哪') || msg.includes('第一次'))) {
      return '第一次约会推荐去安静的咖啡厅或创意餐厅，环境舒适又不会太正式。饭后可以去公园散步或逛逛文艺街区，轻松的氛围更容易自然交流。记住：安全第一，选公共场所哦～'
    }

    if (msg.includes('开场') || msg.includes('怎么回') || msg.includes('怎么聊')) {
      return '聊天开场可以从对方资料里找话题：\n1. 夸对方的照片或穿搭\n2. 聊聊共同爱好标签\n3. 问一个轻松有趣的问题\n比如"看你喜欢旅行，最想去的地方是哪？"这样自然又不会尴尬～'
    }

    if (msg.includes('冷淡') || msg.includes('不理')) {
      return '对方冷淡可能有几种情况：\n1. 对方比较忙，可以过段时间再聊聊\n2. 话题不太合适，可以换对方感兴趣的方向\n3. 缘分不够，也不用强求\n保持平常心，把精力放在更合适的人身上～'
    }

    if (msg.includes('穿搭') || msg.includes('穿什么')) {
      return '约会穿搭核心是"干净得体 + 体现个人风格"：\n男生：简约衬衫或质感T恤，配休闲长裤，别穿拖鞋\n女生：根据约会场合选，质感好的连衣裙或休闲套装都很加分\n最重要的是穿得舒服自信，做真实自己！'
    }

    if (msg.includes('真心') || msg.includes('判断') || msg.includes('喜欢')) {
      return '判断对方真心可以看几点：\n1. 是否主动关心你的生活和感受\n2. 是否愿意花时间陪你，而不仅仅是聊天\n3. 在关键问题上是否坦诚\n4. 行动比语言更重要\n但最重要的还是你自己的感受，相信直觉～'
    }

    return '谢谢你的信任！不管是恋爱困惑、约会建议还是相处技巧，我都很乐意帮你。可以告诉我具体遇到什么情况，我给你更有针对性的建议～'
  }
}
