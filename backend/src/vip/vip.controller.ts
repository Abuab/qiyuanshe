import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common'
import { VipService } from './vip.service'
import { JwtAuthGuard } from '../auth/guards'
import { SystemService } from '../system/system.service'
import { Result } from '../common/result'

@Controller('vip')
export class VipController {
  constructor(
    private readonly vipService: VipService,
    private readonly systemService: SystemService,
  ) {}

  /** 上架套餐列表 */
  @Get('packages')
  async listPackages() {
    return Result.success(await this.vipService.listPackages())
  }

  /** 查询我的置顶卡状态 */
  @Get('top-card/status')
  @UseGuards(JwtAuthGuard)
  async getTopCardStatus(@Request() req: any) {
    return Result.success(await this.vipService.getTopCardStatus(req.user.id))
  }

  /** 使用置顶卡 */
  @Post('top-card/use')
  @UseGuards(JwtAuthGuard)
  async useTopCard(@Request() req: any) {
    if (!(await this.systemService.isVipEnabled())) {
      return Result.success(null, '功能维护中，请稍后再试')
    }
    try {
      const result = await this.vipService.useTopCard(req.user.id)
      return Result.success(result, '置顶成功')
    } catch (error: any) {
      return Result.serverError(error?.message || '置顶失败')
    }
  }

  // ========================================================================
  //  红线索 API
  // ========================================================================

  /** 获取红线索状态 */
  @Get('red-line/status')
  @UseGuards(JwtAuthGuard)
  async getRedLineStatus(@Request() req: any) {
    return Result.success(await this.vipService.getRedLineStatus(req.user.id))
  }

  /** 使用红线索解锁目标用户联系方式 */
  @Post('red-line/use')
  @UseGuards(JwtAuthGuard)
  async useRedLine(
    @Request() req: any,
    @Body('targetUserId') targetUserId: number,
  ) {
    if (!(await this.systemService.isVipEnabled())) {
      return Result.success(null, '功能维护中，请稍后再试')
    }
    try {
      const result = await this.vipService.useRedLine(req.user.id, targetUserId)
      return Result.success(result, result.alreadyUnlocked ? '您已解锁过该用户' : '解锁成功')
    } catch (error: any) {
      return Result.serverError(error?.message || '解锁失败')
    }
  }
}
