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
import { In, Repository } from 'typeorm'
import { Feedback, FeedbackStatus } from '../entities/Feedback'
import { User } from '../entities/User'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/feedbacks')
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminFeedbackController {
  constructor(
    @InjectRepository(Feedback) private repo: Repository<Feedback>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** 用内部 userId 批量查出公开 userId 和昵称并附加到记录上 */
  private async attachUsers(items: Feedback[]): Promise<any[]> {
    const ids = [...new Set(items.map((i) => i.userId).filter(Boolean))] as number[]
    if (ids.length === 0) return items
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'userId', 'nickname'],
    })
    const map = new Map(users.map((u) => [u.id, u]))
    return items.map((i) => {
      const u = map.get(i.userId)
      return {
        ...i,
        publicUserId: u?.userId || '',
        nickname: u?.nickname || '',
      }
    })
  }

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
    const enriched = await this.attachUsers(list)
    return Result.success({ list: enriched, total, page: Number(page), limit: Number(limit) })
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const feedback = await this.repo.findOne({ where: { id } })
    if (!feedback) return Result.notFound('反馈记录不存在')
    const [enriched] = await this.attachUsers([feedback])
    return Result.success(enriched)
  }

  @Put(':id/process')
  async process(@Param('id', ParseIntPipe) id: number) {
    const feedback = await this.repo.findOne({ where: { id } })
    if (!feedback) return Result.notFound('反馈记录不存在')
    await this.repo.update(id, { status: FeedbackStatus.PROCESSED })
    return Result.success(null, '已标记为已处理')
  }
}
