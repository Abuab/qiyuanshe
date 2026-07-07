import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AdminRole } from '../shared/enums'
import { Result } from '../common/result'
import { PersonalityStatsService } from './personality-stats.service'

/**
 * 管理后台：人格测试 - 数据统计看板
 * 权限：超级管理员 / 红娘 / 运营
 */
@Controller('admin/personality/stats')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
export class AdminPersonalityStatsController {
  constructor(private readonly service: PersonalityStatsService) {}

  @Get('overview')
  async overview() {
    return Result.success(await this.service.overview())
  }

  @Get('type-distribution')
  async typeDistribution() {
    return Result.success(await this.service.typeDistribution())
  }

  @Get('type-users')
  async typeUsers(
    @Query('typeCode') typeCode: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return Result.success(
      await this.service.typeUsers(
        typeCode,
        page ? parseInt(page, 10) : 1,
        pageSize ? parseInt(pageSize, 10) : 20,
      ),
    )
  }

  @Get('dimension-distribution')
  async dimensionDistribution() {
    return Result.success(await this.service.dimensionDistribution())
  }

  @Get('question-stats')
  async questionStats() {
    return Result.success(await this.service.questionStats())
  }

  @Get('funnel')
  async funnel() {
    return Result.success(await this.service.funnel())
  }

  @Get('float-button')
  async floatButton() {
    return Result.success(await this.service.floatButton())
  }
}
