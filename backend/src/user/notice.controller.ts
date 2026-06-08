import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notice } from '../entities/Notice'
import { Result } from '../common/result'
import { SystemService } from '../system/system.service'

@Controller('notices')
export class UserNoticeController {
  constructor(
    @InjectRepository(Notice)
    private readonly repo: Repository<Notice>,
    private readonly systemService: SystemService,
  ) {}

  @Get()
  async list() {
    const notices = await this.repo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    })
    // 替换模板变量 {{appName}}
    for (const notice of notices) {
      notice.content = await this.systemService.replaceTemplateVars(notice.content)
    }
    return Result.success(notices)
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const notice = await this.repo.findOne({ where: { id, status: 1 } })
    if (!notice) {
      return Result.notFound('公告不存在')
    }
    // 替换模板变量 {{appName}}
    notice.content = await this.systemService.replaceTemplateVars(notice.content)
    return Result.success(notice)
  }
}
