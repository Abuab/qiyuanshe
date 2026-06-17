import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { VipService } from '../vip/vip.service'
import { Result } from '../common/result'

/** 管理后台 — VIP 页面内容配置 */
@Controller('admin/vip-config')
@Roles('super_admin', 'operator')
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
}
