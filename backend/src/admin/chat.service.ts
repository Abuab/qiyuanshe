import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Brackets } from 'typeorm'
import { ChatMessage } from '../entities/ChatMessage'

@Injectable()
export class AdminChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
  ) {}

  /** 查询所有用户的会话列表（含搜索） */
  async getAllConversations(query: {
    page?: number
    limit?: number
    keyword?: string
  }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    // 子查询：每对用户之间最新一条消息的 ID
    const subQuery = this.messageRepository
      .createQueryBuilder('m')
      .select('MAX(m.id)', 'maxId')
      .groupBy(
        'CASE WHEN m.fromUserId < m.toUserId THEN m.fromUserId ELSE m.toUserId END',
      )
      .addGroupBy(
        'CASE WHEN m.fromUserId < m.toUserId THEN m.toUserId ELSE m.fromUserId END',
      )

    const mainQb = this.messageRepository
      .createQueryBuilder('msg')
      .innerJoin('(' + subQuery.getQuery() + ')', 'lm', 'msg.id = lm.maxId')
      .leftJoin('msg.fromUser', 'fromUser')
      .leftJoin('msg.toUser', 'toUser')
      .select('msg.id', 'messageId')
      .addSelect('msg.content', 'lastMessage')
      .addSelect('msg.type', 'messageType')
      .addSelect('msg.createdAt', 'lastTime')
      .addSelect('msg.fromUserId', 'fromUserId')
      .addSelect('msg.toUserId', 'toUserId')
      .addSelect('fromUser.nickname', 'fromNickname')
      .addSelect('toUser.nickname', 'toNickname')
      .addSelect('fromUser.avatar', 'fromAvatar')
      .addSelect('toUser.avatar', 'toAvatar')

    if (query.keyword) {
      mainQb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('fromUser.nickname LIKE :kw', { kw: `%${query.keyword}%` })
            .orWhere('toUser.nickname LIKE :kw', { kw: `%${query.keyword}%` })
        }),
      )
    }

    mainQb.orderBy('lastTime', 'DESC').offset(skip).limit(limit)

    const rawList: any[] = await mainQb.getRawMany()

    // 统计不同聊天对的个数
    const countQb = this.messageRepository
      .createQueryBuilder('m')
      .select(
        'COUNT(DISTINCT CASE WHEN m.fromUserId < m.toUserId THEN CONCAT(m.fromUserId,"_",m.toUserId) ELSE CONCAT(m.toUserId,"_",m.fromUserId) END)',
        'total',
      )

    const countResult = await countQb.getRawOne()
    const total = Number(countResult?.total) || 0

    const list = rawList.map((r: any) => ({
      messageId: Number(r.messageId),
      fromUserId: Number(r.fromUserId),
      toUserId: Number(r.toUserId),
      fromNickname: r.fromNickname,
      toNickname: r.toNickname,
      fromAvatar: r.fromAvatar,
      toAvatar: r.toAvatar,
      lastMessage: r.lastMessage,
      messageType: r.messageType,
      lastTime: r.lastTime ? new Date(r.lastTime).toISOString() : null,
    }))

    return { list, page, limit, total }
  }

  /** 查询两个用户之间的聊天记录 */
  async getMessages(
    fromUserId: number,
    toUserId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit

    const [list, total] = await this.messageRepository.findAndCount({
      where: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
      relations: ['fromUser', 'toUser'],
    })

    return { list, page, limit, total }
  }

  /** 查询某个用户的所有会话 */
  async getUserConversations(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit

    // 与该用户有聊天的对方用户 ID 列表
    const rawMessages = await this.messageRepository
      .createQueryBuilder('m')
      .select([
        'm.fromUserId',
        'm.toUserId',
        'm.content',
        'm.type',
        'm.createdAt',
      ])
      .where('m.id IN (SELECT MAX(m2.id) FROM chat_messages m2 WHERE m2.fromUserId = :uid OR m2.toUserId = :uid GROUP BY CASE WHEN m2.fromUserId = :uid THEN m2.toUserId ELSE m2.fromUserId END)', { uid: userId })
      .leftJoin('m.fromUser', 'fromUser')
      .leftJoin('m.toUser', 'toUser')
      .addSelect(['fromUser.nickname', 'fromUser.avatar', 'toUser.nickname', 'toUser.avatar'])
      .orderBy('m.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany()

    // 统计总数
    const countRaw = await this.messageRepository
      .createQueryBuilder('m')
      .select('COUNT(DISTINCT CASE WHEN m.fromUserId = :uid THEN m.toUserId ELSE m.fromUserId END)', 'total')
      .where('m.fromUserId = :uid OR m.toUserId = :uid', { uid: userId })
      .getRawOne()

    const total = Number(countRaw?.total) || 0

    const list = (rawMessages || []).map((r: any) => {
      const isFrom = Number(r.m_fromUserId) === userId
      const peerUserId = isFrom ? Number(r.m_toUserId) : Number(r.m_fromUserId)
      return {
        userId: peerUserId,
        nickname: isFrom ? r.toUser_nickname || r.to_nickname : r.fromUser_nickname || r.from_nickname,
        avatar: isFrom ? r.toUser_avatar || r.to_avatar : r.fromUser_avatar || r.from_avatar,
        lastMessage: r.m_content,
        messageType: r.m_type,
        lastTime: r.m_createdAt ? new Date(r.m_createdAt).toISOString() : null,
      }
    })

    return { list, page, limit, total }
  }
}
