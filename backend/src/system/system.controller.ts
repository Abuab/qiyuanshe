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

/**
 * 公开系统配置接口（供小程序前端调用，无需登录）
 */
@Controller('system')
export class PublicSystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config')
  async getPublicConfig() {
    const configs = await this.systemService.getAllConfigs()

    // 组装前端需要的格式
    const result = {
      splashText: configs.basic?.splashText || '正在寻找你的缘分...',
      appName: configs.basic?.appName || '栖缘社',
      shareTitle: configs.share?.title || '栖缘社 - 遇见对的TA',
      shareDesc: configs.share?.desc || '专业的婚恋匹配平台，为你找到最合适的另一半',
      matchmakers: configs.basic?.matchmakers || [],
    }

    return Result.success(result)
  }
}
