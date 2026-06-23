import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { PaymentService } from './payment.service'
import { CreateOrderDto, QueryOrdersDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)

  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    const result = await this.paymentService.createOrder(req.user.userId, dto)
    return { success: true, orderNo: result.orderNo, payParams: result.payParams }
  }

  /** 支付回调 - 仅接受微信官方 IP */
  @Post('notify')
  async wechatNotify(
    @Body() data: any,
    @Req() req: any,
    @Headers() headers: Record<string, string>,
  ) {
    const clientIp = req.ip || req.connection?.remoteAddress || ''
    if (!this.paymentService.isWechatCallbackIp(clientIp)) {
      this.logger.warn(`[回调] 非微信来源 IP 被拦截: ${clientIp}`)
      throw new ForbiddenException('Forbidden')
    }
    const rawBody = (req as any).rawBody || req.body ? JSON.stringify(data) : undefined
    return this.paymentService.processNotify(data, rawBody, headers)
  }

  /** 模拟支付 - 仅 JWT 用户，生产环境拒绝非管理员 */
  @Post('mock-pay')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Body('orderNo') orderNo: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'admin'
    await this.paymentService.mockPay(orderNo, req.user.userId, isAdmin)
    return { success: true, message: '支付成功（测试模式）' }
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(@Query() query: QueryOrdersDto, @Request() req: any) {
    const result = await this.paymentService.getOrders(req.user.userId, query.page, query.limit)
    return { success: true, ...result }
  }

  @Get('orders/:orderNo')
  @UseGuards(JwtAuthGuard)
  async getOrderByNo(@Param('orderNo') orderNo: string, @Request() req: any) {
    const result = await this.paymentService.getOrderByNo(orderNo, req.user.userId)
    return { success: true, data: result }
  }
}
