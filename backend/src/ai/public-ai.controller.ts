import { Controller, Get } from '@nestjs/common'
import { AiConfigService } from './ai-config.service'
import { Result } from '../common/result'

/**
 * 小程序端公开接口：获取 AI 功能开关配置
 * 无需登录即可访问
 */
@Controller('ai')
export class PublicAiController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get('feature-config')
  async getFeatureConfig() {
    const config = await this.aiConfigService.getPublicConfig()
    return Result.success(config)
  }
}
