import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OperationTag } from '../entities/OperationTag'

@Injectable()
export class AdminOperationTagService {
  constructor(
    @InjectRepository(OperationTag)
    private readonly tagRepository: Repository<OperationTag>,
  ) {}

  async list(): Promise<OperationTag[]> {
    return this.tagRepository.find({
      where: { isDeleted: 0 },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
  }

  /** 获取所有启用标签（供打标签选择） */
  async getEnabled(): Promise<Pick<OperationTag, 'id' | 'name' | 'color'>[]> {
    return this.tagRepository.find({
      where: { isDeleted: 0, isEnabled: 1 },
      order: { sortOrder: 'ASC', id: 'ASC' },
      select: ['id', 'name', 'color'],
    })
  }

  async detail(id: number): Promise<OperationTag | null> {
    return this.tagRepository.findOne({ where: { id, isDeleted: 0 } })
  }

  async create(data: Partial<OperationTag>): Promise<OperationTag> {
    const tag = this.tagRepository.create(data)
    return this.tagRepository.save(tag)
  }

  async update(id: number, data: Partial<OperationTag>): Promise<void> {
    await this.tagRepository.update(id, data)
  }

  async remove(id: number): Promise<void> {
    await this.tagRepository.update(id, { isDeleted: 1 })
  }
}
