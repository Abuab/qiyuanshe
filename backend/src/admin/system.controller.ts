import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminSystemService, SystemConfigs } from './system.service'
import { NotifyChannelService } from './notify-channel.service'
import { Result } from '../common/result'

@Controller('admin/system')
@Roles('super_admin')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminSystemController {
  constructor(
    private readonly systemService: AdminSystemService,
    private readonly notifyService: NotifyChannelService,
  ) {}

  @Get('configs')
  async getConfigs() {
    const configs = await this.systemService.getConfigs()
    return Result.success(configs)
  }

  @Put('configs')
  async saveConfigs(@Body() body: SystemConfigs) {
    await this.systemService.saveConfigs(body)
    return Result.success(null, '保存成功')
  }

  @Get('config/:key')
  async getConfig(@Param('key') key: string) {
    const value = await this.systemService.getConfig(key)
    return Result.success(value)
  }

  @Put('config/:key')
  async updateConfig(@Param('key') key: string, @Body('value') value: string) {
    await this.systemService.updateConfig(key, value)
    return Result.success(null, '更新成功')
  }

  @Get('notify-logs')
  async getNotifyLogs() {
    const logs = await this.notifyService.getRecentLogs(20)
    return Result.success(logs)
  }
}
