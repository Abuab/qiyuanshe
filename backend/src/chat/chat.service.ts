import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ChatMessage } from '../entities/ChatMessage'
import { User } from '../entities/User'
import { SendMessageDto, QueryMessagesDto, QueryConversationsDto, PollMessagesDto } from './dto'

@Injectable()
export class ChatService {
  private readonly dailyFreeMessages = 3
  private messageCountCache: Map<number, { count: number; date: string }> = new Map()

  private bannedKeywords = [
    // 赌博
    '赌博', '博彩', '赌场', '下注', '押注', '赔率', '六合彩', '时时彩',
    // 色情
    '裸聊', '约炮', '嫖娼', '卖淫', '色情', '成人',
    // 违法
    '毒品', '枪支', '假钞', '洗钱', '诈骗',
    // 广告
    '加微信', '加我微信', '加VX', '加我VX', '微商', '刷单',
    // 政治敏感
    '台独', '藏独', '疆独',
  ]

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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

    // 敏感词过滤
    if (type === 'text') {
      const hit = this.bannedKeywords.find(kw => content?.includes(kw))
      if (hit) {
        throw new ForbiddenException('消息包含违规内容，无法发送')
      }
    }

    const message = this.messageRepository.create({
      fromUserId: userId,
      toUserId,
      content,
      type,
      isRead: 0,
    })

    const saved = await this.messageRepository.save(message)

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
