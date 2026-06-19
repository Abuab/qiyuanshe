import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiProfileGenService } from './ai-profile-gen.service'
import { Result } from '../common/result'

/**
 * 小程序端：AI 个人画像生成接口
 */
@Controller('ai/profile-gen')
@UseGuards(JwtAuthGuard)
export class AiProfileGenController {
  constructor(private readonly profileGenService: AiProfileGenService) {}

  /**
   * 检查画像生成条件
   * GET /ai/profile-gen/eligibility
   */
  @Get('eligibility')
  async checkEligibility(@Req() req: any) {
    const data = await this.profileGenService.checkEligibility(req.user.id)
    return Result.success(data)
  }

  /**
   * 获取当前画像
   * GET /ai/profile-gen/profile
   */
  @Get('profile')
  async getProfile(@Req() req: any) {
    const data = await this.profileGenService.getProfile(req.user.id)
    if (!data) {
      return Result.success(null, '尚未生成AI印象')
    }
    return Result.success(data)
  }

  /**
   * 生成/刷新画像
   * POST /ai/profile-gen/refresh
   */
  @Post('refresh')
  async refresh(@Req() req: any) {
    const data = await this.profileGenService.generate(req.user.id, false)
    return Result.success(data, 'AI印象已生成')
  }

  /**
   * 查询本月剩余配额
   * GET /ai/profile-gen/quota
   */
  @Get('quota')
  async getQuota(@Req() req: any) {
    const data = await this.profileGenService.getQuota(req.user.id)
    return Result.success(data)
  }
}
