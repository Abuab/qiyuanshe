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
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { AdminAuditService } from './audit.service'
import { Result } from '../common/result'

interface AuditFilter {
  page?: number
  limit?: number
  type?: string
  status?: number
  startDate?: string
  endDate?: string
}

@Controller('admin/audit')
@UseGuards(AdminJwtAuthGuard)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get('list')
  async list(@Query() filter: AuditFilter) {
    const result = await this.auditService.list(filter)
    return Result.success(result)
  }

  @Get('pending-count')
  async pendingCount() {
    const count = await this.auditService.getPendingCount()
    return Result.success(count)
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    await this.auditService.approve(id, reason)
    return Result.success(null, '审核通过')
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    await this.auditService.reject(id, reason)
    return Result.success(null, '已拒绝')
  }

  @Post('batch-approve')
  async batchApprove(@Body('ids') ids: number[]) {
    await this.auditService.batchApprove(ids)
    return Result.success(null, '批量通过成功')
  }

  @Post('batch-reject')
  async batchReject(@Body() body: { ids: number[]; reason: string }) {
    await this.auditService.batchReject(body.ids, body.reason)
    return Result.success(null, '批量拒绝成功')
  }

  @Get('history/:type/:targetId')
  async getHistory(
    @Param('type') type: string,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    const history = await this.auditService.getHistory(type, targetId)
    return Result.success(history)
  }
}
