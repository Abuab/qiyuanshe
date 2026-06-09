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

    const message = this.messageRepository.create({
      fromUserId: userId,
      toUserId,
      content,
      type,
      isRead: 0,
    })

    return this.messageRepository.save(message)
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

    // 使用原始 SQL 代替 subQuery.getQuery() 拼接，避免参数注入错位导致同一对话出现两条
    const conversations = await this.messageRepository.query(
      `SELECT
        m.id AS "id",
        m.content AS "lastMessage",
        m."createdAt" AS "createdAt",
        CASE WHEN m."fromUserId" = ? THEN m."toUserId" ELSE m."fromUserId" END AS "userId",
        CASE WHEN m."fromUserId" = ? THEN u2.nickname ELSE u1.nickname END AS "nickname",
        CASE WHEN m."fromUserId" = ? THEN u2.avatar ELSE u1.avatar END AS "avatar"
      FROM chat_messages m
      INNER JOIN (
        SELECT
          MAX(id) AS "lastMessageId",
          CASE WHEN "fromUserId" = ? THEN "toUserId" ELSE "fromUserId" END AS "otherUserId"
        FROM chat_messages
        WHERE "fromUserId" = ? OR "toUserId" = ?
        GROUP BY CASE WHEN "fromUserId" = ? THEN "toUserId" ELSE "fromUserId" END
      ) AS last_msg ON m.id = last_msg."lastMessageId"
      LEFT JOIN users u1 ON u1.id = m."fromUserId"
      LEFT JOIN users u2 ON u2.id = m."toUserId"
      ORDER BY m."createdAt" DESC
      LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, userId, userId, userId, limit, skip],
    )

    const unreadCounts = await this.messageRepository
      .createQueryBuilder('msg')
      .select('msg.fromUserId', 'fromUserId')
      .addSelect('COUNT(*)', 'count')
      .where('msg.toUserId = :userId', { userId })
      .andWhere('msg.isRead = 0')
      .groupBy('msg.fromUserId')
      .getRawMany()

    const unreadMap = new Map(unreadCounts.map((u) => [u.fromUserId, parseInt(u.count)]))

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
          SELECT DISTINCT CASE WHEN msg1."fromUserId" = :userId THEN msg1."toUserId" ELSE msg1."fromUserId" END
          FROM chat_messages msg1
          WHERE msg1."fromUserId" = :userId OR msg1."toUserId" = :userId
        )`,
        { userId },
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
