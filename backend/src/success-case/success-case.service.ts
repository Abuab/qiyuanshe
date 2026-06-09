import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SuccessCase } from '../entities/SuccessCase'

@Injectable()
export class SuccessCaseService {
  constructor(
    @InjectRepository(SuccessCase)
    private readonly caseRepo: Repository<SuccessCase>,
  ) {}

  // ========== 小程序端 ==========

  async getList(page = 1, limit = 10) {
    const [list, total] = await this.caseRepo.findAndCount({
      where: { status: 1 },
      order: { sort: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }

  async getDetail(id: number) {
    return this.caseRepo.findOne({ where: { id, status: 1 } })
  }

  // ========== 管理后台 ==========

  async getListAll(page = 1, limit = 10) {
    const [list, total] = await this.caseRepo.findAndCount({
      order: { sort: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { list, total, page, limit }
  }

  async create(data: {
    title: string
    cover: string
    maleUserId: number
    femaleUserId: number
    storyContent: string
    photos: string[]
    sort: number
  }) {
    const item = this.caseRepo.create({ ...data, status: 1 })
    return this.caseRepo.save(item)
  }

  async update(id: number, data: {
    title?: string
    cover?: string
    maleUserId?: number
    femaleUserId?: number
    storyContent?: string
    photos?: string[]
    status?: number
    sort?: number
  }) {
    await this.caseRepo.update(id, data)
    return this.caseRepo.findOne({ where: { id } })
  }

  async remove(id: number) {
    await this.caseRepo.update(id, { status: 0 })
  }
}
