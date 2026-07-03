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
import { AdminMatchmakerService } from './matchmaker.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

interface MatchmakerFilter {
  page?: number
  limit?: number
  keyword?: string
  status?: number
}

@Controller('admin/matchmakers')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.READONLY)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminMatchmakerController {
  constructor(private readonly matchmakerService: AdminMatchmakerService) {}

  @Get()
  async list(@Query() filter: MatchmakerFilter) {
    const result = await this.matchmakerService.list(filter)
    return Result.success(result)
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const matchmaker = await this.matchmakerService.detail(id)
    return Result.success(matchmaker)
  }

  @Post()
  async create(@Body() data: any) {
    await this.matchmakerService.create(data)
    return Result.success(null, '添加成功')
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    await this.matchmakerService.update(id, data)
    return Result.success(null, '更新成功')
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.matchmakerService.delete(id)
    return Result.success(null, '删除成功')
  }

  @Put(':id/sort')
  async sort(
    @Param('id', ParseIntPipe) id: number,
    @Body('sortOrder') sortOrder: number,
  ) {
    await this.matchmakerService.updateSort(id, sortOrder)
    return Result.success(null, '排序更新成功')
  }
}
