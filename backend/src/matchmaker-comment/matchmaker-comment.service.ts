import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { MatchRecord } from '../entities/MatchRecord'

@Injectable()
export class MatchmakerCommentService {
  constructor(
    @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepo: Repository<MatchRecord>,
  ) {}

  // 获取某会员的所有评语（含红娘信息）
  async getByUser(userId: number) {
    return this.commentRepo.find({
      where: { userId, status: 1 },
      relations: ['matchmaker'],
      order: { createdAt: 'DESC' },
    })
  }

  // 获取所有评语列表
  async getList() {
    return this.commentRepo.find({
      where: { status: 1 },
      relations: ['matchmaker'],
      order: { createdAt: 'DESC' },
    })
  }

  // 创建评语
  async create(data: { matchmakerId: number; userId: number; content: string; rating: number }) {
    const comment = this.commentRepo.create({ ...data, status: 1 })
    const saved = await this.commentRepo.save(comment)

    // 同时创建 match_record，使其在动态页红娘区展示
    try {
      const record = this.matchRecordRepo.create({
        userId: data.userId,           // 被评价用户自己看不到这条
        matchedUserId: data.userId,
        matchmakerId: data.matchmakerId,
        remark: data.content,
        status: 'in_progress',
      })
      await this.matchRecordRepo.save(record)
    } catch (e) { /* 非关键路径，不影响主流程 */ }

    return saved
  }

  // 删除评语（原始SQL物理删除）
  async remove(id: number) {
    await this.commentRepo
      .createQueryBuilder()
      .delete()
      .from('matchmaker_comments')
      .where('id = :id', { id })
      .execute()
  }

  // 更新评语
  async update(id: number, data: { content?: string; rating?: number }) {
    await this.commentRepo.update(id, data)
    return this.commentRepo.findOne({ where: { id }, relations: ['matchmaker', 'user'] })
  }

  // 管理后台：获取所有评语
  async getAll(page = 1, limit = 20) {
    const [list, total] = await this.commentRepo.findAndCount({
      relations: ['matchmaker', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }
}
