import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { ChatMessage } from '../entities/ChatMessage'
import { resolveAvatarUrl } from '../common/image-url'

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

    // 用 LEAST/GREATEST 函数取代 CASE WHEN，利用功能索引 idx_chat_pair_latest
    const baseParams: any[] = []
    const conditions: string[] = []

    if (query.keyword) {
      conditions.push('(fu.nickname LIKE ? OR tu.nickname LIKE ?)')
      baseParams.push(`%${query.keyword}%`, `%${query.keyword}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 子查询：利用功能索引获取每对用户最新消息 ID
    const subSql = `
      SELECT MAX(id) AS maxId
      FROM chat_messages
      GROUP BY LEAST(fromUserId, toUserId), GREATEST(fromUserId, toUserId)
    `

    const countSql = `
      SELECT COUNT(*) AS total FROM (${subSql}) AS conv
    `

    const dataSql = `
      SELECT
        msg.id AS messageId,
        msg.content AS lastMessage,
        msg.type AS messageType,
        msg.createdAt AS lastTime,
        msg.fromUserId,
        msg.toUserId,
        fu.nickname AS fromNickname,
        tu.nickname AS toNickname,
        fu.avatar AS fromAvatar,
        tu.avatar AS toAvatar
      FROM chat_messages msg
      INNER JOIN (${subSql}) lm ON msg.id = lm.maxId
      LEFT JOIN users fu ON msg.fromUserId = fu.id
      LEFT JOIN users tu ON msg.toUserId = tu.id
      ${whereClause}
      ORDER BY msg.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const [countResult, rawList] = await Promise.all([
      this.messageRepository.query(countSql),
      this.messageRepository.query(dataSql, [...baseParams, limit, skip]),
    ])

    const total = Number(countResult?.[0]?.total) || 0

    const list = rawList.map((r: any) => ({
      messageId: Number(r.messageId),
      fromUserId: Number(r.fromUserId),
      toUserId: Number(r.toUserId),
      fromNickname: r.fromNickname,
      toNickname: r.toNickname,
      fromAvatar: resolveAvatarUrl(r.fromAvatar),
      toAvatar: resolveAvatarUrl(r.toAvatar),
      lastMessage: r.lastMessage,
      messageType: r.messageType,
      lastTime: r.lastTime ? new Date(r.lastTime).toISOString() : null,
    }))

    return { list, page, limit, total }
  }

  /** 查询两个用户之间的聊天记录（游标分页：beforeId > 0 加载更早消息，否则加载最新消息） */
  async getMessages(
    fromUserId: number,
    toUserId: number,
    page: number = 1,
    limit: number = 50,
    beforeId?: number,
  ) {
    const whereConditions = [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ]

    let list: any[]
    let total: number

    if (beforeId && beforeId > 0) {
      // 上拉加载更多：查 id < beforeId 的更早消息，DESC + take + reverse 为正序
      whereConditions.forEach((cond: any) => (cond.id = LessThan(beforeId)))
      ;[list, total] = await this.messageRepository.findAndCount({
        where: whereConditions,
        order: { createdAt: 'DESC', id: 'DESC' },
        take: limit,
        relations: ['fromUser', 'toUser'],
      })
      list.reverse()
      console.log('[AdminChat] getMessages loadMore beforeId=', beforeId, 'returned=', list.length, 'total=', total, 'firstId=', list[0]?.id, 'firstTime=', list[0]?.createdAt, 'lastId=', list[list.length - 1]?.id, 'lastTime=', list[list.length - 1]?.createdAt)
    } else {
      // 首次加载/分页跳转：查最新的 limit 条，DESC + take + reverse 为正序（旧→新）
      ;[list, total] = await this.messageRepository.findAndCount({
        where: whereConditions,
        order: { createdAt: 'DESC', id: 'DESC' },
        take: limit,
        relations: ['fromUser', 'toUser'],
      })
      list.reverse()
      console.log('[AdminChat] getMessages firstLoad returned=', list.length, 'total=', total, 'firstId=', list[0]?.id, 'firstTime=', list[0]?.createdAt, 'lastId=', list[list.length - 1]?.id, 'lastTime=', list[list.length - 1]?.createdAt)
    }

    // 将关联用户头像解析为完整 URL（兼容数据库中遗留的相对路径）
    list.forEach((msg: any) => {
      if (msg.fromUser) msg.fromUser.avatar = resolveAvatarUrl(msg.fromUser.avatar)
      if (msg.toUser) msg.toUser.avatar = resolveAvatarUrl(msg.toUser.avatar)
    })

    return { list, page, limit, total }
  }

  /** 轮询增量拉取新消息（监控页面用） */
  async pollMessages(
    userId: number,
    targetUserId: number,
    lastMessageId: number = 0,
  ) {
    const qb = this.messageRepository
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.fromUser', 'fromUser')
      .leftJoinAndSelect('msg.toUser', 'toUser')
      .where(
        '((msg.fromUserId = :u1 AND msg.toUserId = :u2) OR (msg.fromUserId = :u2 AND msg.toUserId = :u1))',
        { u1: userId, u2: targetUserId },
      )
      .orderBy('msg.createdAt', 'ASC')
      .addOrderBy('msg.id', 'ASC')

    if (lastMessageId > 0) {
      qb.andWhere('msg.id > :lastId', { lastId: lastMessageId })
    }

    const list = await qb.getMany()

    // 将关联用户头像解析为完整 URL
    list.forEach((msg: any) => {
      if (msg.fromUser) msg.fromUser.avatar = resolveAvatarUrl(msg.fromUser.avatar)
      if (msg.toUser) msg.toUser.avatar = resolveAvatarUrl(msg.toUser.avatar)
    })

    return { list }
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
        avatar: resolveAvatarUrl(isFrom ? r.toUser_avatar || r.to_avatar : r.fromUser_avatar || r.from_avatar),
        lastMessage: r.m_content,
        messageType: r.m_type,
        lastTime: r.m_createdAt ? new Date(r.m_createdAt).toISOString() : null,
      }
    })

    return { list, page, limit, total }
  }
}
