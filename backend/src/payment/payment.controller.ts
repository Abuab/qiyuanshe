import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  RawBodyRequest,
} from '@nestjs/common'
import { PaymentService } from './payment.service'
import { CreateOrderDto, QueryOrdersDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    const result = await this.paymentService.createOrder(req.user.userId, dto)

    return {
      success: true,
      orderNo: result.orderNo,
      payParams: result.payParams,
    }
  }

  @Post('notify')
  async wechatNotify(@Body() data: any) {
    return this.paymentService.processNotify(data)
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(@Query() query: QueryOrdersDto, @Request() req: any) {
    const result = await this.paymentService.getOrders(
      req.user.userId,
      query.page,
      query.limit,
    )

    return {
      success: true,
      ...result,
    }
  }

  @Get('orders/:orderNo')
  @UseGuards(JwtAuthGuard)
  async getOrderByNo(@Param('orderNo') orderNo: string, @Request() req: any) {
    const result = await this.paymentService.getOrderByNo(orderNo, req.user.userId)

    return {
      success: true,
      data: result,
    }
  }
}
