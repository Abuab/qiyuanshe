import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common'
import { AuditService } from './audit.service'
import {
  AuditPhotoDto,
  AuditTextDto,
  QueryPendingAuditDto,
  ApproveAuditDto,
  RejectAuditDto,
} from './dto/audit.dto'
import { JwtAuthGuard } from '../auth/guards'
import { AdminGuard } from '../auth/guards/admin.guard'

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('photo')
  async auditPhoto(@Body() dto: AuditPhotoDto) {
    return this.auditService.auditPhoto(dto)
  }

  @Post('text')
  async auditText(@Body() dto: AuditTextDto) {
    return this.auditService.auditText(dto)
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getPendingAudit(@Query() dto: QueryPendingAuditDto) {
    const result = await this.auditService.getPendingAudit(dto)

    return {
      success: true,
      ...result,
    }
  }

  @Post(':type/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async approve(@Param('type') type: string, @Param('id', ParseIntPipe) id: number, @Body() dto: ApproveAuditDto, @Request() req: any) {
    dto.adminId = req.user.userId
    const result = await this.auditService.approve(type, id, dto)

    return {
      success: true,
      ...result,
    }
  }

  @Post(':type/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async reject(@Param('type') type: string, @Param('id', ParseIntPipe) id: number, @Body() dto: RejectAuditDto, @Request() req: any) {
    dto.adminId = req.user.userId
    const result = await this.auditService.reject(type, id, dto)

    return {
      success: true,
      ...result,
    }
  }

  @Get('history/:type/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAuditHistory(@Param('type') type: string, @Param('id', ParseIntPipe) id: number) {
    const result = await this.auditService.getAuditHistory(type, id)

    return {
      success: true,
      data: result,
    }
  }
}
