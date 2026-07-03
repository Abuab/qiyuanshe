import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { VipService } from '../vip/vip.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

/** 管理后台 — VIP 页面内容配置 */
@Controller('admin/vip-config')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminVipConfigController {
  constructor(private readonly vipService: VipService) {}

  /** 获取定制会员页配置 */
  @Get('custom')
  async getCustomConfig() {
    return Result.success(await this.vipService.getCustomConfig())
  }

  /** 保存定制会员页配置 */
  @Put('custom')
  async saveCustomConfig(@Body() body: any) {
    await this.vipService.saveCustomConfig(body)
    return Result.success(null, '保存成功')
  }

  /** 获取关于我们页配置 */
  @Get('about')
  async getAboutConfig() {
    return Result.success(await this.vipService.getAboutConfig())
  }

  /** 保存关于我们页配置 */
  @Put('about')
  async saveAboutConfig(@Body() body: any) {
    await this.vipService.saveAboutConfig(body)
    return Result.success(null, '保存成功')
  }

  /** 获取安全征婚提示配置 */
  @Get('safety-tips')
  async getSafetyTips() {
    return Result.success(await this.vipService.getSafetyTipsConfig())
  }

  /** 保存安全征婚提示配置 */
  @Put('safety-tips')
  async saveSafetyTips(@Body() body: { tips: string[] }) {
    await this.vipService.saveSafetyTipsConfig(body.tips || [])
    return Result.success(null, '保存成功')
  }

  /** 获取红线索显示名称 */
  @Get('red-line-term')
  async getRedLineTerm() {
    return Result.success({ term: await this.vipService.getRedLineTerm() })
  }

  /** 保存红线索显示名称 */
  @Put('red-line-term')
  async setRedLineTerm(@Body('term') term: string) {
    await this.vipService.setRedLineTerm(term || '红线索')
    return Result.success(null, '保存成功')
  }

  /** 查看用户红线索使用记录 */
  @Get('red-line-usages/:userId')
  async getRedLineUsages(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return Result.success(await this.vipService.getRedLineUsages(userId, page, limit))
  }
}
