import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AdminRole } from '../shared/enums'
import { Result } from '../common/result'
import { PersonalityDimensionService } from './personality-dimension.service'

/**
 * 管理后台：人格测试 - 维度管理
 * 权限：仅超级管理员与红娘可访问
 */
@Controller('admin/personality/dimensions')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER)
export class AdminPersonalityDimensionController {
  constructor(private readonly service: PersonalityDimensionService) {}

  @Get()
  async list() {
    return Result.success(await this.service.list())
  }

  @Get('enabled')
  async enabled() {
    return Result.success(await this.service.enabledList())
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return Result.success(await this.service.getById(parseInt(id, 10)))
  }

  @Post()
  async create(@Body() body: any) {
    return Result.success(await this.service.create(body), '新增成功')
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return Result.success(await this.service.update(parseInt(id, 10), body), '更新成功')
  }

  @Put(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: any) {
    await this.service.setEnabled(parseInt(id, 10), body.isEnabled)
    return Result.success(null, '操作成功')
  }

  @Put(':id/reorder')
  async reorder(@Param('id') id: string, @Body() body: any) {
    await this.service.reorder(parseInt(id, 10), body.sort)
    return Result.success(null, '排序成功')
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(parseInt(id, 10))
    return Result.success(null, '删除成功')
  }
}
