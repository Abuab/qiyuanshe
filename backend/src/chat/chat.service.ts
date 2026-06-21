import { Injectable, ForbiddenException, NotFoundException, Optional, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ChatMessage } from '../entities/ChatMessage'
import { User } from '../entities/User'
import { SendMessageDto, QueryMessagesDto, QueryConversationsDto, PollMessagesDto } from './dto'
import { ChatMonitorGateway } from './chat-monitor.gateway'
import { RedisService } from '../common/redis.service'
import { AuditService } from '../audit/audit.service'
import { SystemService } from '../system/system.service'

/** Redis Key 前缀：记录每对会话的最后一条消息 ID */
const LAST_MSG_KEY_PREFIX = 'chat:last_msg_id'

/** Redis TTL：24 小时 */
const LAST_MSG_TTL = 86400

/** 限流：每分钟最多 20 条消息 */
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_SEC = 60

@Injectable()
export class ChatService {
  private readonly dailyFreeMessages = 3
  private messageCountCache: Map<number, { count: number; date: string }> = new Map()

  private bannedKeywords = [
    // ===== 脏话/辱骂 =====
    '傻逼', '傻B', '煞笔', 'SB', 'sb', 'Sb', 'sB',
    '尼玛', '你妈', 'nmb', 'NMB', 'cnm', 'CNM', '草泥马', '艹你', '操你',
    '去死', '去你妈', '滚蛋', '滚犊子',
    '贱人', '婊子', '骚货', '荡妇', '破鞋',
    '垃圾', '废物', '白痴', '脑残', '智障', '弱智', '神经病',
    '狗日的', '日了狗', '他妈的', '特么的', '你妈的', '靠',
    '妈的', '妈蛋', '卧槽', '我操', '我艹', '次奥',
    '畜生', '禽兽', '猪狗不如', '不是人', '狗屁',
    '龟孙子', '王八蛋', '王八', '混蛋',
    // ===== 赌博 =====
    '赌博', '博彩', '赌场', '下注', '押注', '赔率', '六合彩', '时时彩', '百家乐',
    '炸金花', '德州扑克', '赌球', '外围',
    // ===== 色情 =====
    '裸聊', '约炮', '嫖娼', '卖淫', '色情', '成人',
    '一夜情', '援交', '包养', '外围女', '大保健',
    // ===== 违法 =====
    '毒品', '冰毒', '海洛因', '大麻', '枪支', '假钞', '洗钱', '诈骗', '传销',
    '高利贷', '套现', '盗刷',
    // ===== 广告/引流 =====
    '加微信', '加我微信', '加VX', '加我VX', '加我vx', '加vx', '加 WX', '加 wx',
    '微商', '刷单', '兼职日结', '扫码', '二维码',
    '加Q', '加q', '加我Q', '加我q', '加QQ', '加qq', '加我QQ', '加我qq',
    '加群', '进群', 'V我', 'v我',
    // ===== 政治敏感 =====
    '台独', '藏独', '疆独', '港独', '法轮功',
  ]

  /**
   * 检查文本是否包含违禁词。
   * 同时检查原文和去除所有空格后的文本，防止用空格绕过。
   */
  private checkBannedContent(text: string): string | null {
    if (!text) return null
    const stripped = text.replace(/\s+/g, '')
    for (const kw of this.bannedKeywords) {
      if (text.includes(kw) || stripped.toLowerCase().includes(kw.toLowerCase())) {
        return kw
      }
    }
    return null
  }

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional()
    @Inject(forwardRef(() => ChatMonitorGateway))
    private readonly monitorGateway?: ChatMonitorGateway,
    private readonly redisService?: RedisService,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly systemService?: SystemService,
  ) {}

  /**
   * 生成 Redis Key：chat:last_msg_id:${minUserId}_${maxUserId}
   */
  private getConversationKey(userId1: number, userId2: number): string {
    const minId = Math.min(userId1, userId2)
    const maxId = Math.max(userId1, userId2)
    return `${LAST_MSG_KEY_PREFIX}:${minId}_${maxId}`
  }

  async sendMessage(userId: number, dto: SendMessageDto): Promise<ChatMessage> {
    const { toUserId, content, type = 'text' } = dto

    if (userId === toUserId) {
      throw new ForbiddenException('不能给自己发送消息')
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: toUserId, isDeleted: 0 },
    })

    if (!targetUser) {
      throw new NotFoundException('用户不存在')
    }

    const isVip = await this.checkUserVipStatus(userId)

    if (!isVip) {
      const todayCount = await this.getTodayMessageCount(userId)
      if (todayCount >= this.dailyFreeMessages) {
        throw new ForbiddenException('今日消息已用完，开通会员即可无限畅聊')
      }
    }

    // ===== 修改点 B：限流检查（Redis 计数器，审核之前） =====
    if (this.redisService) {
      const rateLimitKey = `rate_limit:chat:user_${userId}`
      let currentCount: number
      try {
        currentCount = await this.redisService.incr(rateLimitKey)
        if (currentCount === 1) {
          await this.redisService.expire(rateLimitKey, RATE_LIMIT_WINDOW_SEC)
        }
        if (currentCount > RATE_LIMIT_MAX) {
          throw new ForbiddenException('发送太频繁，请稍后再试')
        }
      } catch (e) {
        // Redis 限流异常时不阻断，继续往下走
        if (e instanceof ForbiddenException) throw e
        console.error('Redis 限流检查失败，降级放行:', e)
      }
    }

    // ===== 修改点 B：内容审核（文字消息） =====
    if (type === 'text') {
      await this.auditMessageContent(userId, content)
    }

    const message = this.messageRepository.create({
      fromUserId: userId,
      toUserId,
      content,
      type,
      isRead: 0,
    })

    const saved = await this.messageRepository.save(message)

    // 优化 B：更新 Redis 中该会话的最后一条消息 ID
    if (this.redisService) {
      const convKey = this.getConversationKey(userId, toUserId)
      try {
        await Promise.race([
          this.redisService.set(convKey, String(saved.id), LAST_MSG_TTL),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ])
      } catch {
        // Redis 写入失败或超时不影响主流程
      }
    }

    // 通知监控该用户的管理员（实时推送）
    if (this.monitorGateway) {
      this.monitorGateway.notifyAdmin(userId, {
        id: saved.id,
        fromUserId: saved.fromUserId,
        toUserId: saved.toUserId,
        content: saved.content,
        type: saved.type,
        isProxy: saved.isProxy,
        proxyName: saved.proxyName || null,
        createdAt: saved.createdAt?.toISOString(),
      })
    }

    // 非VIP用户发送成功后更新缓存计数，避免并发绕过限制
    if (!isVip) {
      const today = new Date().toISOString().split('T')[0]
      const cacheEntry = this.messageCountCache.get(userId)
      if (cacheEntry && cacheEntry.date === today) {
        cacheEntry.count++
      } else {
        this.messageCountCache.set(userId, { count: 1, date: today })
      }
    }

    return saved
  }

  async getMessages(userId: number, dto: QueryMessagesDto): Promise<{ list: ChatMessage[]; total: number }> {
    const { userId: toUserId, page, limit } = dto

    const targetUser = await this.userRepository.findOne({
      where: { id: toUserId, isDeleted: 0 },
    })

    if (!targetUser) {
      throw new NotFoundException('用户不存在')
    }

    const skip = (page - 1) * limit

    const [list, total] = await this.messageRepository.findAndCount({
      where: [
        { fromUserId: userId, toUserId },
        { fromUserId: toUserId, toUserId: userId },
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['fromUser', 'toUser'],
    })

    const messagesWithMine = list.map((msg) => ({
      ...msg,
      isMine: msg.fromUserId === userId,
    }))

    return { list: messagesWithMine.reverse(), total }
  }

  async pollMessages(userId: number, dto: PollMessagesDto): Promise<ChatMessage[]> {
    const { userId: toUserId, afterId } = dto

    // 优化 A：先查 Redis 缓存，如果确认没有新消息则直接返回空数组
    if (afterId > 0 && this.redisService) {
      try {
        const convKey = this.getConversationKey(userId, toUserId)
        const cachedLastId = await this.redisService.get(convKey)
        if (cachedLastId) {
          const lastIdNum = Number(cachedLastId)
          if (!isNaN(lastIdNum) && lastIdNum <= afterId) {
            // Redis 记录的最后消息 ID <= 本地已有的最后消息 ID，说明没有新消息
            return []
          }
        }
      } catch {
        // Redis 查询失败，降级到 MySQL 查询
      }
    }

    // MySQL 查询：只查 ID 大于 afterId 的增量消息
    const messages = await this.messageRepository.find({
      where: [
        { fromUserId: userId, toUserId, id: MoreThan(afterId) },
        { fromUserId: toUserId, toUserId: userId, id: MoreThan(afterId) },
      ],
      order: { createdAt: 'ASC' },
      relations: ['fromUser', 'toUser'],
    })

    return messages.map((msg) => ({
      ...msg,
      isMine: msg.fromUserId === userId,
    }))
  }

  async getConversations(
    userId: number,
    dto: QueryConversationsDto,
  ): Promise<{ list: any[]; total: number }> {
    const { page, limit } = dto
    const skip = (page - 1) * limit

    // 子查询：每个聊天对象的最新一条消息 ID
    const latestIds = this.messageRepository
      .createQueryBuilder('m')
      .select('MAX(m.id)', 'maxId')
      .where('m.fromUserId = :uid OR m.toUserId = :uid', { uid: userId })
      .groupBy('CASE WHEN m.fromUserId = :uid2 THEN m.toUserId ELSE m.fromUserId END')
      .setParameter('uid2', userId)

    const conversations = await this.messageRepository
      .createQueryBuilder('msg')
      .innerJoin('(' + latestIds.getQuery() + ')', 'last_msg', 'msg.id = last_msg.maxId')
      .setParameters(latestIds.getParameters())
      .leftJoin('msg.fromUser', 'fromUser')
      .leftJoin('msg.toUser', 'toUser')
      .select('msg.id', 'id')
      .addSelect('msg.content', 'lastMessage')
      .addSelect('msg.type', 'messageType')
      .addSelect('msg.createdAt', 'createdAt')
      .addSelect(
        'CASE WHEN msg.fromUserId = :uid3 THEN msg.toUserId ELSE msg.fromUserId END',
        'userId',
      )
      .addSelect(
        'CASE WHEN msg.fromUserId = :uid4 THEN toUser.nickname ELSE fromUser.nickname END',
        'nickname',
      )
      .addSelect(
        'CASE WHEN msg.fromUserId = :uid5 THEN toUser.avatar ELSE fromUser.avatar END',
        'avatar',
      )
      .setParameter('uid3', userId)
      .setParameter('uid4', userId)
      .setParameter('uid5', userId)
      .orderBy('msg.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany()

    const unreadCounts = await this.messageRepository
      .createQueryBuilder('msg')
      .select('msg.fromUserId', 'fromUserId')
      .addSelect('COUNT(*)', 'count')
      .where('msg.toUserId = :userId', { userId })
      .andWhere('msg.isRead = 0')
      .groupBy('msg.fromUserId')
      .getRawMany()

    const unreadMap = new Map(unreadCounts.map((u: any) => [u.fromUserId, parseInt(u.count)]))

    const result = conversations.map((conv: any) => ({
      id: conv.userId,
      type: 'user',
      userId: conv.userId,
      nickname: conv.nickname,
      avatar: conv.avatar,
      lastMessage: conv.lastMessage,
      createdAt: conv.createdAt,
      unreadCount: unreadMap.get(conv.userId) || 0,
    }))

    const total = await this.userRepository
      .createQueryBuilder('other')
      .where(
        `other.id IN (
          SELECT DISTINCT CASE WHEN msg1.fromUserId = :uid6 THEN msg1.toUserId ELSE msg1.fromUserId END
          FROM chat_messages msg1
          WHERE msg1.fromUserId = :uid6 OR msg1.toUserId = :uid6
        )`,
        { uid6: userId },
      )
      .andWhere('other.id != :userId', { userId })
      .andWhere('other.isDeleted = :isDeleted', { isDeleted: 0 })
      .getCount()

    return { list: result, total }
  }

  async markAsRead(userId: number, fromUserId: number): Promise<void> {
    await this.messageRepository.update(
      {
        fromUserId,
        toUserId: userId,
        isRead: 0,
      },
      {
        isRead: 1,
      },
    )
  }

  async deleteConversation(userId: number, targetUserId: number): Promise<void> {
    await this.messageRepository.delete({
      fromUserId: userId,
      toUserId: targetUserId,
    })

    await this.messageRepository.delete({
      fromUserId: targetUserId,
      toUserId: userId,
    })
  }

  async clearAllConversations(userId: number): Promise<void> {
    await this.messageRepository.delete({
      fromUserId: userId,
    })

    await this.messageRepository.delete({
      toUserId: userId,
    })
  }

  private async checkUserVipStatus(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    })

    if (!user) return false

    if (user.isVip !== 1) return false

    if (user.vipExpireTime && new Date(user.vipExpireTime) < new Date()) {
      return false
    }

    return true
  }

  /**
   * 修改点 B：内容审核方法
   * - 优先使用腾讯云 AI 审核（audit.aiEnabled = true）
   * - 未启用 AI 审核时，降级为本地 bannedKeywords 过滤
   * - AI 审核调用失败时，降级为本地过滤
   */
  private async auditMessageContent(userId: number, content: string): Promise<void> {
    // 读取审核配置
    const aiEnabled = await this.getConfigValue('audit.aiEnabled')

    if (aiEnabled === '1' || aiEnabled === 'true') {
      // === 腾讯云 AI 审核 ===
      if (!this.auditService) {
        // AuditService 未注入，降级为本地过滤
        this.checkLocalBannedContent(content)
        return
      }

      try {
        const auditResult = await this.auditService.auditText({
          text: content,
          type: 'user' as any, // AuditType.USER
          userId,
        })

        if (auditResult.result === 'pass') {
          return // 正常通过
        }

        if (auditResult.result === 'reject') {
          throw new ForbiddenException('消息包含违规内容，请修改后重试')
        }

        // result === 'review'
        if (auditResult.result === 'review') {
          const manualReviewEnabled = await this.getConfigValue('audit.manualReviewEnabled')
          if (manualReviewEnabled === '1' || manualReviewEnabled === 'true') {
            // 人工审核已启用，消息存入但需要标记（实体无 status/isVisible 字段，正常存入）
            // 审核日志已由 AuditService.auditText 自动写入
            // 调用 webhook 通知（预留接口，当前仅打印日志）
            console.log('[ChatService] 消息进入人工审核队列', {
              userId,
              content: content.substring(0, 50),
              time: new Date().toISOString(),
            })
            return // 消息允许保存，人工审核后端可查看 AuditLog 表
          }
          // 人工审核未启用，按拒绝处理
          throw new ForbiddenException('消息包含违规内容，请修改后重试')
        }
      } catch (e: any) {
        // 修改点 B-3：腾讯云审核 API 调用失败，降级为本地敏感词过滤
        if (e instanceof ForbiddenException) throw e
        console.error('腾讯云审核调用失败，降级为本地敏感词过滤:', e)
        this.checkLocalBannedContent(content)
      }
    } else {
      // === 本地敏感词过滤（兜底） ===
      this.checkLocalBannedContent(content)
    }
  }

  /**
   * 本地敏感词过滤（保留作为兜底方案）
   */
  private checkLocalBannedContent(content: string): void {
    const hit = this.checkBannedContent(content)
    if (hit) {
      throw new ForbiddenException('消息包含违规内容，请修改后重试')
    }
  }

  /**
   * 从 SystemConfig 读取字符串配置值，不存在时返回 null
   */
  private async getConfigValue(key: string): Promise<string | null> {
    if (!this.systemService) return null
    try {
      return await this.systemService.getConfig(key)
    } catch {
      return null
    }
  }

  private async getTodayMessageCount(userId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = userId

    const cached = this.messageCountCache.get(cacheKey)
    if (cached && cached.date === today) {
      return cached.count
    }

    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)

    const count = await this.messageRepository.count({
      where: {
        fromUserId: userId,
        createdAt: MoreThan(startOfDay),
      },
    })

    this.messageCountCache.set(cacheKey, { count, date: today })

    return count
  }
}
