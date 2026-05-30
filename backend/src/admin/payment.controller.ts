import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { AdminPaymentService } from './payment.service'
import { Result } from '../common/result'

interface OrderFilter {
  page?: number
  limit?: number
  orderNo?: string
  userKeyword?: string
  status?: number
  startDate?: string
  endDate?: string
  timeRange?: string
}

@Controller('admin/payment')
@UseGuards(JwtAuthGuard)
export class AdminPaymentController {
  constructor(private readonly paymentService: AdminPaymentService) {}

  @Get('orders')
  async orders(@Query() filter: OrderFilter) {
    const result = await this.paymentService.orders(filter)
    return Result.success(result)
  }

  @Get('orders/:id')
  async orderDetail(@Param('id', ParseIntPipe) id: number) {
    const order = await this.paymentService.orderDetail(id)
    return Result.success(order)
  }

  @Post('refund')
  async refund(@Body() body: { orderId: number; reason: string }) {
    await this.paymentService.refund(body.orderId, body.reason)
    return Result.success(null, '退款成功')
  }

  @Get('stats')
  async stats(@Query() params: { timeRange?: string; startDate?: string; endDate?: string }) {
    const stats = await this.paymentService.getStats(params)
    return Result.success(stats)
  }
}
