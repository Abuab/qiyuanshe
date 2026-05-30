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
      queryBuilder.andWhere('matchmaker.status = :status', { status: filter.status })
    }

    queryBuilder.orderBy('matchmaker.sortOrder', 'ASC').addOrderBy('matchmaker.createdAt', 'DESC')

    queryBuilder.skip(skip).take(limit)

    const [matchmakers, total] = await queryBuilder.getManyAndCount()

    return {
      list: matchmakers,
      page,
      limit,
      total,
    }
  }

  async detail(id: number) {
    return this.matchmakerRepository.findOne({ where: { id } })
  }

  async create(data: Partial<Matchmaker>) {
    const matchmaker = this.matchmakerRepository.create(data)
    return this.matchmakerRepository.save(matchmaker)
  }

  async update(id: number, data: Partial<Matchmaker>) {
    await this.matchmakerRepository.update(id, data)
  }

  async delete(id: number) {
    await this.matchmakerRepository.delete(id)
  }

  async updateSort(id: number, sortOrder: number) {
    await this.matchmakerRepository.update(id, { sortOrder })
  }
}
