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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminMessageTemplateService } from './message-template.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/message-templates')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminMessageTemplateController {
  constructor(
    private readonly templateService: AdminMessageTemplateService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ) {
    const result = await this.templateService.list({ page, limit, category, keyword })
    return Result.success(result)
  }

  @Get('selectable')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getSelectable(@Query('category') category?: string) {
    const list = await this.templateService.getSelectable(category)
    return Result.success(list)
  }

  /** 批量/群发场景下，前端调用此接口一次性记录模板使用次数 */
  @Post(':id/record-usage')
  async recordUsage(@Param('id', ParseIntPipe) id: number) {
    await this.templateService.recordUsage(id)
    return Result.success(null, '已记录')
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async detail(@Param('id', ParseIntPipe) id: number) {
    const template = await this.templateService.detail(id)
    if (!template) return Result.notFound('模板不存在')
    return Result.success(template)
  }

  @Post()
  async create(@Body() body: any) {
    const template = await this.templateService.create(body)
    return Result.success(template, '模板创建成功')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.templateService.update(id, body)
    return Result.success(null, '模板更新成功')
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.templateService.remove(id)
    return Result.success(null, '模板已删除')
  }
}
