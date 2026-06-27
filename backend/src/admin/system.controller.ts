import { Controller, Get, Put, Post, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminSystemService, SystemConfigs } from './system.service'
import { NotifyChannelService } from './notify-channel.service'
import { AiQuotaService, QuotaConfig } from '../ai/ai-quota.service'
import { Result } from '../common/result'

@Controller('admin/system')
@Roles('super_admin')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminSystemController {
  constructor(
    private readonly systemService: AdminSystemService,
    private readonly notifyService: NotifyChannelService,
    private readonly quotaService: AiQuotaService,
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

  /** 获取用量限额配置 */
  @Get('quota')
  async getQuotaConfig() {
    const config = await this.quotaService.getConfig()
    return Result.success(config)
  }

  /** 保存用量限额配置 */
  @Put('quota')
  async saveQuotaConfig(@Body() body: QuotaConfig) {
    await this.quotaService.saveConfig(body)
    return Result.success(null, '保存成功')
  }

  @Get('notify-logs')
  async getNotifyLogs(@Query() query: any) {
    const logs = await this.notifyService.getRecentLogs(20, query)
    return Result.success(logs)
  }

  @Post('test-webhook')
  async testWebhook(@Body('channel') channel: string, @Body('url') url: string) {
    if (!url) {
      return Result.error('Webhook 地址不能为空', 400)
    }
    try {
      await this.notifyService.testWebhook(channel, url)
      return Result.success(null, '测试消息发送成功')
    } catch (e: any) {
      return Result.error(e?.message || '发送失败，请检查 Webhook 地址是否正确', 500)
    }
  }

  @Post('retry-webhook/:id')
  async retryWebhook(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.notifyService.retryWebhook(id)
      return Result.success(null, '重试发送成功')
    } catch (e: any) {
      return Result.error(e?.message || '重试发送失败', 500)
    }
  }
}
