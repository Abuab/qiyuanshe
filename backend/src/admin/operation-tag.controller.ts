import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminOperationTagService } from './operation-tag.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/operation-tags')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminOperationTagController {
  constructor(
    private readonly tagService: AdminOperationTagService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async list() {
    const tags = await this.tagService.list()
    return Result.success(tags)
  }

  @Get('enabled')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getEnabled() {
    const tags = await this.tagService.getEnabled()
    return Result.success(tags)
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async detail(@Param('id', ParseIntPipe) id: number) {
    const tag = await this.tagService.detail(id)
    if (!tag) return Result.notFound('标签不存在')
    return Result.success(tag)
  }

  @Post()
  async create(@Body() body: any) {
    const tag = await this.tagService.create(body)
    return Result.success(tag, '标签创建成功')
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.tagService.update(id, body)
    return Result.success(null, '标签更新成功')
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tagService.remove(id)
    return Result.success(null, '标签已删除')
  }
}
