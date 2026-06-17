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
import { Result } from '../common/result'

@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

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
    try {
      const result = await this.vipService.createOrder(
        req.user.userId, packageId, payType,
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
    return Result.success(await this.vipService.getTopCardStatus(req.user.userId))
  }

  /** 使用置顶卡 */
  @Post('top-card/use')
  @UseGuards(JwtAuthGuard)
  async useTopCard(@Request() req: any) {
    try {
      const result = await this.vipService.useTopCard(req.user.userId)
      return Result.success(result, '置顶成功')
    } catch (error: any) {
      return Result.serverError(error?.message || '置顶失败')
    }
  }
}
