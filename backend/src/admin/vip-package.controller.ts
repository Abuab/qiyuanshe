import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { VipPackageService } from './vip-package.service'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

@Controller('admin/vip-packages')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class VipPackageController {
  constructor(private readonly service: VipPackageService) {}

  /** 套餐列表 */
  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return Result.success(await this.service.list(page, limit))
  }

  /** 创建套餐 */
  @Post()
  async create(@Body() body: any) {
    return Result.success(await this.service.create(body), '创建成功')
  }

  /** 编辑套餐 */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return Result.success(await this.service.update(id, body), '更新成功')
  }

  /** 切换上/下架 */
  @Put(':id/toggle')
  async toggle(@Param('id', ParseIntPipe) id: number) {
    const pkg = await this.service.toggleStatus(id)
    return Result.success(pkg, pkg.status === 1 ? '已上架' : '已下架')
  }

  /** 软删除 */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id)
    return Result.success(null, '已删除')
  }

  /** 批量更新排序权重 */
  @Put('sort/batch')
  async batchSort(@Body('items') items: { id: number; sortOrder: number }[]) {
    await this.service.updateSort(items)
    return Result.success(null, '排序更新成功')
  }
}
