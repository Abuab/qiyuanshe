import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Matchmaker } from '../entities/Matchmaker'
import { resolveAvatarUrl, resolveStaticUrl } from '../common/image-url'

export interface MatchmakerListItem {
  id: number
  name: string
  avatar: string
  title: string
  wechat: string
  phone: string
  qrCode: string
  description: string
  isActive: number
  sortOrder: number
  createdAt: Date
}

@Injectable()
export class MatchmakerService {
  constructor(
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepository: Repository<Matchmaker>,
  ) {}

  async findAll(): Promise<MatchmakerListItem[]> {
    const matchmakers = await this.matchmakerRepository.find({
      where: { isActive: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    })

    return matchmakers.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: resolveAvatarUrl(m.avatar),
      title: m.title,
      wechat: m.wechat || '',
      phone: m.phone || '',
      qrCode: resolveStaticUrl(m.qrCode),
      description: m.description || '',
      isActive: m.isActive,
      sortOrder: m.sortOrder,
      createdAt: m.createdAt,
    }))
  }

  async findOne(id: number): Promise<Matchmaker> {
    const matchmaker = await this.matchmakerRepository.findOne({
      where: { id },
    })

    if (!matchmaker) {
      throw new NotFoundException('红娘不存在')
    }

    return matchmaker
  }
}
