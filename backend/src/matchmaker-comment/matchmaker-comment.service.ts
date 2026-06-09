import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MatchmakerComment } from '../entities/MatchmakerComment'

@Injectable()
export class MatchmakerCommentService {
  constructor(
    @InjectRepository(MatchmakerComment)
    private readonly commentRepo: Repository<MatchmakerComment>,
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
    return this.commentRepo.save(comment)
  }

  // 删除评语
  async remove(id: number) {
    await this.commentRepo.update(id, { status: 0 })
  }

  // 管理后台：获取所有评语
  async getAll(page = 1, limit = 20) {
    const [list, total] = await this.commentRepo.findAndCount({
      relations: ['matchmaker'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }
}
