import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { AdminDashboardService } from './dashboard.service'
import { Result } from '../common/result'

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  async stats() {
    const stats = await this.dashboardService.getStats()
    return Result.success(stats)
  }
}
