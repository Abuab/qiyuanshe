import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
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

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const notice = await this.repo.findOne({ where: { id, status: 1 } })
    if (!notice) {
      return Result.notFound('公告不存在')
    }
    return Result.success(notice)
  }
}
