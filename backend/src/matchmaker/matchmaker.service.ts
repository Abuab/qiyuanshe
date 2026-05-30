import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Matchmaker } from '../entities/Matchmaker'
import { CreateMatchmakerDto, UpdateMatchmakerDto } from './dto'

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
      avatar: m.avatar,
      title: m.title,
      wechat: m.wechat || '',
      phone: m.phone || '',
      qrCode: m.qrCode || '',
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

  async create(dto: CreateMatchmakerDto): Promise<Matchmaker> {
    const matchmaker = this.matchmakerRepository.create({
      ...dto,
      isActive: dto.isActive ?? 1,
      sortOrder: dto.sortOrder ?? 0,
    })

    return this.matchmakerRepository.save(matchmaker)
  }

  async update(id: number, dto: UpdateMatchmakerDto): Promise<Matchmaker> {
    const matchmaker = await this.findOne(id)

    Object.assign(matchmaker, dto)

    return this.matchmakerRepository.save(matchmaker)
  }

  async remove(id: number): Promise<void> {
    const matchmaker = await this.findOne(id)
    await this.matchmakerRepository.remove(matchmaker)
  }

  async updateSortOrder(id: number, sortOrder: number): Promise<Matchmaker> {
    const matchmaker = await this.findOne(id)
    matchmaker.sortOrder = sortOrder
    return this.matchmakerRepository.save(matchmaker)
  }
}
