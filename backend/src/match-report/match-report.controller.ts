import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { MatchReportService } from './match-report.service'

@Controller('match-report')
@UseGuards(JwtAuthGuard)
export class MatchReportController {
  constructor(private readonly matchReportService: MatchReportService) {}

  /** 入口状态：开关、名额、是否已生成（用于按钮显隐/置灰） */
  @Get('status')
  async getStatus(@Req() req: any) {
    return this.matchReportService.getStatus(req.user.id)
  }

  /** 获取当前用户已生成的报告（未生成返回 null） */
  @Get()
  async getMyReport(@Req() req: any) {
    return this.matchReportService.getMyReport(req.user.id)
  }

  /** 生成匹配分析报告 */
  @Post('generate')
  async generate(@Req() req: any) {
    return this.matchReportService.generate(req.user.id)
  }
}
