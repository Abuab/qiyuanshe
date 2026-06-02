import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, In, MoreThan, LessThan } from 'typeorm'
import { ChatMessage } from '../entities/ChatMessage'
import { User } from '../entities/User'
import { Follow } from '../entities/Follow'
import { SendMessageDto, QueryMessagesDto, QueryConversationsDto } from './dto'

@Injectable()
export class ChatService {
  private readonly dailyFreeMessages = 3
  private messageCountCache: Map<number, { count: number; date: string }> = new Map()

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly dataSource: DataSource,
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

    const isFollowing = await this.followRepository.findOne({
      where: [
        { userId: userId, targetUserId: toUserId },
        { userId: toUserId, targetUserId: userId },
      ],
    })

    if (!isFollowing) {
      throw new ForbiddenException('需要互相关注才能聊天')
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

  async getConversations(
    userId: number,
    dto: QueryConversationsDto,
  ): Promise<{ list: any[]; total: number }> {
    const { page, limit } = dto
    const skip = (page - 1) * limit

    const subQuery = this.messageRepository
      .createQueryBuilder('msg')
      .select('MAX(msg.id)', 'lastMessageId')
      .where('(msg.fromUserId = :userId OR msg.toUserId = :userId)', { userId })
      .groupBy('CASE WHEN msg.fromUserId = :userId THEN msg.toUserId ELSE msg.fromUserId END')

    const conversations = await this.messageRepository
      .createQueryBuilder('msg')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'last_msg',
        'msg.id = last_msg.lastMessageId',
      )
      .setParameters(subQuery.getParameters())
      .leftJoin('msg.fromUser', 'fromUser')
      .leftJoin('msg.toUser', 'toUser')
      .select([
        'msg.id as id',
        'msg.content as "lastMessage"',
        'msg.createdAt as "createdAt"',
        '(CASE WHEN msg.fromUserId = :userId THEN msg.toUserId ELSE msg.fromUserId END) as "userId"',
        '(CASE WHEN msg.fromUserId = :userId THEN toUser.nickname ELSE fromUser.nickname END) as nickname',
        '(CASE WHEN msg.fromUserId = :userId THEN toUser.avatar ELSE fromUser.avatar END) as avatar',
      ])
      .setParameter('userId', userId)
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

    const unreadMap = new Map(unreadCounts.map((u) => [u.fromUserId, parseInt(u.count)]))

    const result = conversations.map((conv) => ({
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
          SELECT DISTINCT CASE WHEN msg1.fromUserId = :userId THEN msg1.toUserId ELSE msg1.fromUserId END
          FROM chat_messages msg1
          WHERE msg1.fromUserId = :userId OR msg1.toUserId = :userId
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
