import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminDashboardService } from './dashboard.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/dashboard')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  async stats(@Query('timeRange') timeRange: string = 'week') {
    const stats = await this.dashboardService.getStats()
    return Result.success(stats)
  }

  @Get('user-trend')
  async getUserTrend(@Query('timeRange') timeRange: string = 'week') {
    const data = await this.dashboardService.getUserTrend(timeRange)
    return Result.success(data)
  }

  @Get('gender-distribution')
  async getGenderDistribution() {
    const data = await this.dashboardService.getGenderDistribution()
    return Result.success(data)
  }

  @Get('age-distribution')
  async getAgeDistribution() {
    const data = await this.dashboardService.getAgeDistribution()
    return Result.success(data)
  }

  @Get('revenue-trend')
  async getRevenueTrend(@Query('timeRange') timeRange: string = 'week') {
    const data = await this.dashboardService.getRevenueTrend(timeRange)
    return Result.success(data)
  }

  @Get('funnel')
  async getFunnelData() {
    const data = await this.dashboardService.getFunnelData()
    return Result.success(data)
  }
}
