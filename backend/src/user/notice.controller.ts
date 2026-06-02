import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notice } from '../entities/Notice'
import { Result } from '../common/result'

@Controller('notices')
export class UserNoticeController {
  constructor(
    @InjectRepository(Notice)
    private readonly repo: Repository<Notice>,
  ) {}

  @Get()
  async list() {
    const notices = await this.repo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    })
    return Result.success(notices)
  }
}
