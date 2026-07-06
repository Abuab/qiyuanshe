import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
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

  /** 创建订单 */
  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Request() req: any,
    @Body('packageId') packageId: number,
    @Body('payType') payType?: string,
  ) {
    if (!(await this.systemService.isVipEnabled())) {
      return Result.success(null, '功能维护中，请稍后再试')
    }
    try {
      const result = await this.vipService.createOrder(
        req.user.id, packageId, payType,
      )
      return Result.success(result, '订单创建成功')
    } catch (error: any) {
      return Result.serverError(error?.message || '创建订单失败')
    }
  }

  /**
   * 模拟支付成功回调
   * 真实环境由微信支付回调调用
   */
  @Put('orders/:orderNo/pay')
  @UseGuards(JwtAuthGuard)
  async payOrder(
    @Param('orderNo') orderNo: string,
    @Body('transactionId') transactionId?: string,
  ) {
    if (!(await this.systemService.isVipEnabled())) {
      return Result.success(null, '功能维护中，请稍后再试')
    }
    try {
      const result = await this.vipService.handlePaymentSuccess(
        orderNo, transactionId,
      )
      return Result.success(result, '支付成功，会员已激活')
    } catch (error: any) {
      return Result.serverError(error?.message || '支付处理失败')
    }
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

  /** 定制会员页面配置 */
  @Get('custom-config')
  async getCustomConfig() {
    return Result.success(await this.vipService.getCustomConfig())
  }

  /** 关于我们页面配置 */
  @Get('about-config')
  async getAboutConfig() {
    return Result.success(await this.vipService.getAboutConfig())
  }

  /** 安全征婚提示 */
  @Get('safety-tips')
  async getSafetyTips() {
    return Result.success(await this.vipService.getSafetyTipsConfig())
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

  /** 获取红线索显示名称（公开，不需登录） */
  @Get('red-line/term')
  async getRedLineTerm() {
    return Result.success({ term: await this.vipService.getRedLineTerm() })
  }
}
