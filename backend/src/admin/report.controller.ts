import { Controller, Get, Put, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Report } from '../entities/Report'
import { User } from '../entities/User'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/reports')
@Roles(AdminRole.SUPER_ADMIN)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminReportController {
  constructor(
    @InjectRepository(Report) private repo: Repository<Report>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** 为举报记录附加举报人/被举报人的公开 userId 和昵称 */
  private async attachUsers(items: Report[]): Promise<any[]> {
    const ids = [
      ...new Set(
        items.flatMap((i) => [i.reporterId, i.targetId]).filter(Boolean),
      ),
    ] as number[]
    if (ids.length === 0) return items
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'userId', 'nickname'],
    })
    const map = new Map(users.map((u) => [u.id, u]))
    return items.map((i) => {
      const reporter = map.get(i.reporterId)
      const target = map.get(i.targetId)
      return {
        ...i,
        reporterPublicId: reporter?.userId || '',
        reporterNickname: reporter?.nickname || '',
        targetPublicId: target?.userId || '',
        targetNickname: target?.nickname || '',
      }
    })
  }

  @Get()
  async list(@Query() q: any) {
    const page = parseInt(q.page) || 1
    const limit = parseInt(q.limit) || 20
    const skip = (page - 1) * limit
    const qb = this.repo.createQueryBuilder('report')
    if (q.status !== undefined && q.status !== '') qb.andWhere('report.status = :status', { status: q.status })
    if (q.type) qb.andWhere('report.type = :type', { type: q.type })
    if (q.reason) qb.andWhere('report.reason = :reason', { reason: q.reason })
    qb.orderBy('report.createdAt', 'DESC').skip(skip).take(limit)
    const [list, total] = await qb.getManyAndCount()
    const enriched = await this.attachUsers(list)
    return Result.success({ list: enriched, total, page, limit })
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const report = await this.repo.findOne({ where: { id } })
    if (!report) return Result.success(null)
    const [enriched] = await this.attachUsers([report])
    return Result.success(enriched)
  }

  @Put(':id')
  async process(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: number; result?: string; remark?: string },
  ) {
    await this.repo.update(id, {
      status: body.status,
      result: body.result,
      remark: body.remark,
    })

    if (body.result === 'disable') {
      const report = await this.repo.findOne({ where: { id } })
      if (report) {
        await this.userRepo.update(report.targetId, { status: 2 })
      }
    }

    return Result.success(null, '处理成功')
  }
}
