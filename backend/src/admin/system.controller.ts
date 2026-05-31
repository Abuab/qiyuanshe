import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { AdminSystemService } from './system.service'
import { Result } from '../common/result'

interface SystemConfigs {
  basic?: Record<string, any>
  share?: Record<string, any>
  vip?: Record<string, any>
  payment?: Record<string, any>
  audit?: Record<string, any>
}

@Controller('admin/system')
@UseGuards(AdminJwtAuthGuard)
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

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
  async getConfig(@Body('key') key: string) {
    const value = await this.systemService.getConfig(key)
    return Result.success(value)
  }

  @Put('config/:key')
  async updateConfig(@Body('key') key: string, @Body('value') value: string) {
    await this.systemService.updateConfig(key, value)
    return Result.success(null, '更新成功')
  }
}
