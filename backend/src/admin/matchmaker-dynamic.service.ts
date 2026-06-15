import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MatchRecord } from '../entities/MatchRecord'
import { MatchmakerComment } from '../entities/MatchmakerComment'

@Injectable()
export class AdminMatchmakerDynamicService {
  constructor(
    @InjectRepository(MatchRecord)
    private readonly matchRecordRepository: Repository<MatchRecord>,
    @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
  ) {}

  /** 获取红娘动态列表 */
  async list(page = 1, limit = 20) {
    const qb = this.matchRecordRepository
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.matchmaker', 'matchmaker')
      .leftJoinAndSelect('mr.matchedUser', 'matchedUser')
      .where('mr.matchmakerId IS NOT NULL')
      .orderBy('mr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const [records, total] = await qb.getManyAndCount()

    return {
      list: records.map((r) => ({
        id: r.id,
        matchmakerId: r.matchmakerId,
        matchmakerName: r.matchmaker?.name || '-',
        matchmakerAvatar: r.matchmaker?.avatar || '',
        matchedUserId: r.matchedUserId,
        matchedNickname: r.matchedUser?.nickname || '用户' + r.matchedUserId,
        matchedAvatar: r.matchedUser?.avatar || '',
        remark: r.remark || '',
        status: r.status,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    }
  }

  /** 创建红娘动态 */
  async create(data: { matchmakerId: number; matchedUserId: number; remark: string }) {
    const record = this.matchRecordRepository.create({
      matchmakerId: data.matchmakerId,
      matchedUserId: data.matchedUserId,
      userId: data.matchedUserId, // 避免用户自己看到这条
      remark: data.remark,
      status: 'in_progress',
    })
    const saved = await this.matchRecordRepository.save(record)

    // 同时创建 matchmaker_comment，保持数据一致
    try {
      const comment = this.commentRepo.create({
        matchmakerId: data.matchmakerId,
        userId: data.matchedUserId,
        content: data.remark,
        status: 1,
      })
      await this.commentRepo.save(comment)
    } catch (e) { /* 非关键路径，不影响主流程 */ }

    return saved
  }

  /** 更新红娘动态（编辑 remark） */
  async update(id: number, data: { remark?: string; status?: string }) {
    await this.matchRecordRepository.update(id, data)
    return this.matchRecordRepository.findOne({ where: { id } })
  }

  /** 删除红娘动态 */
  async remove(id: number) {
    await this.matchRecordRepository.delete(id)
  }
}
