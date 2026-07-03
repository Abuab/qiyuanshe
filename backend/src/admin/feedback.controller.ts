import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Feedback, FeedbackStatus } from '../entities/Feedback'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/feedbacks')
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminFeedbackController {
  constructor(
    @InjectRepository(Feedback) private repo: Repository<Feedback>,
  ) {}

  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit)
    const qb = this.repo.createQueryBuilder('feedback')
    if (status !== undefined && status !== '') {
      qb.andWhere('feedback.status = :status', { status: Number(status) })
    }
    qb.orderBy('feedback.createdAt', 'DESC').skip(skip).take(Number(limit))
    const [list, total] = await qb.getManyAndCount()
    return Result.success({ list, total, page: Number(page), limit: Number(limit) })
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const feedback = await this.repo.findOne({ where: { id } })
    if (!feedback) return Result.notFound('反馈记录不存在')
    return Result.success(feedback)
  }

  @Put(':id/process')
  async process(@Param('id', ParseIntPipe) id: number) {
    const feedback = await this.repo.findOne({ where: { id } })
    if (!feedback) return Result.notFound('反馈记录不存在')
    await this.repo.update(id, { status: FeedbackStatus.PROCESSED })
    return Result.success(null, '已标记为已处理')
  }
}
