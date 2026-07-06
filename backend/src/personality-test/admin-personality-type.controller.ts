import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AdminRole } from '../shared/enums'
import { Result } from '../common/result'
import { PersonalityTypeService } from './personality-type.service'

/**
 * 管理后台：人格测试 - 人格类型定义
 * 权限：仅超级管理员与红娘可访问
 */
@Controller('admin/personality/types')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER)
export class AdminPersonalityTypeController {
  constructor(private readonly service: PersonalityTypeService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('isEnabled') isEnabled?: string,
  ) {
    const data = await this.service.getAdminList({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword,
      isEnabled: isEnabled !== undefined && isEnabled !== '' ? parseInt(isEnabled, 10) : undefined,
    })
    return Result.success(data)
  }

  @Get('options')
  async options() {
    return Result.success(await this.service.optionsList())
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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(parseInt(id, 10))
    return Result.success(null, '删除成功')
  }
}
