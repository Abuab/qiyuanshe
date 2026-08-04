import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, FindOptionsWhere, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { AdminAuditLog } from '../entities/AdminAuditLog'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminRole } from '../shared/enums'

@Controller('admin/audit-logs')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
export class AdminAuditLogController {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
  ) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('module') module?: string,
    @Query('adminId') adminId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: FindOptionsWhere<AdminAuditLog> = {}

    if (action) {
      where.action = action
    }
    if (module) {
      where.module = module
    }
    if (adminId) {
      where.adminId = parseInt(adminId, 10)
    }
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate + 'T23:59:59'))
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate))
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(new Date(endDate + 'T23:59:59'))
    }

    const [list, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { success: true, list, total, page, limit }
  }
}
