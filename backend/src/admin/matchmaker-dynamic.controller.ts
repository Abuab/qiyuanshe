import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminMatchmakerDynamicService } from './matchmaker-dynamic.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/matchmaker-dynamics')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminMatchmakerDynamicController {
  constructor(private readonly service: AdminMatchmakerDynamicService) {}

  @Get()
  async list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.service.list(page || 1, limit || 20)
    return Result.success(data)
  }

  @Post()
  async create(
    @Body() body: { matchmakerId: number; matchedUserId: number; remark: string },
  ) {
    const record = await this.service.create(body)
    return Result.success(record, '发布成功')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { remark?: string; status?: string },
  ) {
    const record = await this.service.update(id, body)
    return Result.success(record, '更新成功')
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id)
    return Result.success(null, '删除成功')
  }
}
