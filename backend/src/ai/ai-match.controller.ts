import { Controller, Get, Post, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiMatchService } from './ai-match.service'
import { Result } from '../common/result'

/**
 * 小程序端：AI 缘分匹配分析接口
 */
@Controller('ai/match')
@UseGuards(JwtAuthGuard)
export class AiMatchController {
  constructor(private readonly aiMatchService: AiMatchService) {}

  /**
   * 检查与目标用户的 AI 分析资料完备性
   * GET /ai/match/eligibility/:targetUserId
   */
  @Get('eligibility/:targetUserId')
  async checkEligibility(
    @Req() req: any,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    const data = await this.aiMatchService.checkEligibility(req.user.id, targetUserId)
    return Result.success(data)
  }

  /**
   * 执行缘分匹配分析
   * POST /ai/match/analyze/:targetUserId
   */
  @Post('analyze/:targetUserId')
  async analyze(
    @Req() req: any,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    const data = await this.aiMatchService.analyze(req.user.id, targetUserId)
    return Result.success(data, data.fromCache ? '（缓存结果）' : '分析完成')
  }

  /**
   * 查询今日剩余配额
   * GET /ai/match/quota
   */
  @Get('quota')
  async getQuota(@Req() req: any) {
    const data = await this.aiMatchService.getQuota(req.user.id)
    return Result.success(data)
  }

  /**
   * 查询与目标用户的已有报告（不触发新分析，仅返回缓存）
   * GET /ai/match/report/:targetUserId
   */
  @Get('report/:targetUserId')
  async getReport(
    @Req() req: any,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    const data = await this.aiMatchService.analyze(req.user.id, targetUserId)
    return Result.success(data)
  }
}
