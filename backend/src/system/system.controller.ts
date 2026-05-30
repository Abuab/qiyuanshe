import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards'
import { SystemService } from './system.service'
import { Result } from '../common/result'

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('configs')
  async getConfigs() {
    const configs = await this.systemService.getAllConfigs()
    return Result.success(configs)
  }

  @Get('config/:key')
  async getConfig(@Param('key') key: string) {
    const value = await this.systemService.getConfig(key)
    return Result.success(value)
  }

  @Put('configs')
  @UseGuards(JwtAuthGuard)
  async saveConfigs(@Body() configs: Record<string, any>) {
    await this.systemService.saveConfigs(configs)
    return Result.success(null, '配置保存成功')
  }
}
