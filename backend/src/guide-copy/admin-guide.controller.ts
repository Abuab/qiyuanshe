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
import { CopySlotService } from './copy-slot.service'
import { CopyItemService } from './copy-item.service'
import { CopyStatsService } from './copy-stats.service'
import { GuideConfigService } from './guide-config.service'

/**
 * 管理后台：引导文案配置中心 + 首页浮动按钮配置
 * 权限：仅超级管理员与运营可访问
 */
@Controller('admin/guide')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
export class AdminGuideController {
  constructor(
    private readonly slotService: CopySlotService,
    private readonly itemService: CopyItemService,
    private readonly statsService: CopyStatsService,
    private readonly configService: GuideConfigService,
  ) {}

  // ==================== 首页浮动按钮配置 ====================

  @Get('floating-button')
  async getFloatingButton() {
    return Result.success(await this.configService.getFloatingButton())
  }

  @Put('floating-button')
  async saveFloatingButton(@Body() body: any) {
    return Result.success(await this.configService.saveFloatingButton(body), '保存成功')
  }

  // ==================== 文案位 ====================

  @Get('slots')
  async listSlots() {
    return Result.success(await this.slotService.getAdminList())
  }

  @Get('slots/:id')
  async getSlot(@Param('id') id: string) {
    return Result.success(await this.slotService.getById(parseInt(id, 10)))
  }

  @Get('slots/:id/dashboard')
  async dashboard(@Param('id') id: string) {
    return Result.success(await this.statsService.getDashboard(parseInt(id, 10)))
  }

  @Post('slots')
  async createSlot(@Body() body: any) {
    return Result.success(await this.slotService.create(body), '新增成功')
  }

  @Put('slots/:id')
  async updateSlot(@Param('id') id: string, @Body() body: any) {
    return Result.success(await this.slotService.update(parseInt(id, 10), body), '更新成功')
  }

  @Delete('slots/:id')
  async removeSlot(@Param('id') id: string) {
    await this.slotService.remove(parseInt(id, 10))
    return Result.success(null, '删除成功')
  }

  // ==================== 文案条目 ====================

  @Get('items')
  async listItems(@Query('slotId') slotId: string) {
    return Result.success(await this.itemService.listBySlot(parseInt(slotId, 10)))
  }

  @Post('items')
  async createItem(@Body() body: any) {
    return Result.success(await this.itemService.create(body), '新增成功')
  }

  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() body: any) {
    return Result.success(await this.itemService.update(parseInt(id, 10), body), '更新成功')
  }

  @Put('items/:id/status')
  async setItemStatus(@Param('id') id: string, @Body() body: any) {
    await this.itemService.setEnabled(parseInt(id, 10), body.isEnabled)
    return Result.success(null, '操作成功')
  }

  @Delete('items/:id')
  async removeItem(@Param('id') id: string) {
    await this.itemService.remove(parseInt(id, 10))
    return Result.success(null, '删除成功')
  }
}
