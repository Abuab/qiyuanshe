import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { SystemService } from './system.service'
import { Result } from '../common/result'

@Controller('admin/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('configs')
  @UseGuards(AdminJwtAuthGuard)
  async getConfigs() {
    const configs = await this.systemService.getAllConfigs()
    return Result.success(configs)
  }

  @Get('config/:key')
  @UseGuards(AdminJwtAuthGuard)
  async getConfig(@Param('key') key: string) {
    const value = await this.systemService.getConfig(key)
    return Result.success(value)
  }

  @Put('configs')
  @UseGuards(AdminJwtAuthGuard)
  async saveConfigs(@Body() configs: Record<string, any>) {
    await this.systemService.saveConfigs(configs)
    return Result.success(null, '配置保存成功')
  }
}
