import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { AdminDashboardService } from './dashboard.service'
import { Result } from '../common/result'

@Controller('admin/dashboard')
@UseGuards(AdminJwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  async stats() {
    const stats = await this.dashboardService.getStats()
    return Result.success(stats)
  }
}
