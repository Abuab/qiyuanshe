import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Matchmaker } from '../entities/Matchmaker'

interface MatchmakerFilter {
  page?: number
  limit?: number
  keyword?: string
  status?: number
}

@Injectable()
export class AdminMatchmakerService {
  constructor(
    @InjectRepository(Matchmaker)
    private readonly matchmakerRepository: Repository<Matchmaker>,
  ) {}

  private transformToResponse(matchmaker: Matchmaker) {
    return {
      ...matchmaker,
      status: matchmaker.isActive,
      qrcode: matchmaker.qrCode,
    }
  }

  private transformFromInput(data: any) {
    const result: any = {}
    if (data.name !== undefined) result.name = data.name
    if (data.avatar !== undefined) result.avatar = data.avatar
    if (data.title !== undefined) result.title = data.title
    if (data.wechat !== undefined) result.wechat = data.wechat
    if (data.phone !== undefined) result.phone = data.phone
    if (data.qrcode !== undefined) result.qrCode = data.qrcode
    if (data.description !== undefined) result.description = data.description
    if (data.status !== undefined) result.isActive = data.status
    if (data.sortOrder !== undefined) result.sortOrder = data.sortOrder
    return result
  }

  async list(filter: MatchmakerFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20
    const skip = (page - 1) * limit

    const queryBuilder = this.matchmakerRepository.createQueryBuilder('matchmaker')

    if (filter.keyword) {
      queryBuilder.where('matchmaker.name LIKE :keyword', {
        keyword: `%${filter.keyword}%`,
      })
    }

    if (filter.status !== undefined) {
      queryBuilder.andWhere('matchmaker.isActive = :status', { status: filter.status })
    }

    queryBuilder.orderBy('matchmaker.sortOrder', 'ASC').addOrderBy('matchmaker.createdAt', 'DESC')

    queryBuilder.skip(skip).take(limit)

    const [matchmakers, total] = await queryBuilder.getManyAndCount()

    return {
      list: matchmakers.map(m => this.transformToResponse(m)),
      page,
      limit,
      total,
    }
  }

  async detail(id: number) {
    const matchmaker = await this.matchmakerRepository.findOne({ where: { id } })
    if (matchmaker) {
      return this.transformToResponse(matchmaker)
    }
    return null
  }

  async create(data: any) {
    const transformedData = this.transformFromInput(data)
    const matchmaker = this.matchmakerRepository.create(transformedData)
    return this.matchmakerRepository.save(matchmaker)
  }

  async update(id: number, data: any) {
    const transformedData = this.transformFromInput(data)
    await this.matchmakerRepository.update(id, transformedData)
  }

  async delete(id: number) {
    await this.matchmakerRepository.delete(id)
  }

  async updateSort(id: number, sortOrder: number) {
    await this.matchmakerRepository.update(id, { sortOrder })
  }
}
