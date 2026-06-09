import {
  Controller,
  Get,
  Header,
} from '@nestjs/common'
import { SystemService } from './system.service'
import { Result } from '../common/result'

/**
 * 公开系统配置接口（供小程序前端调用，无需登录）
 * 注意：管理后台的 /admin/system/* 路由由 AdminSystemController 处理
 */
@Controller('system')
export class PublicSystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('config')
  @Header('Cache-Control', 'no-store, no-cache, max-age=0')
  @Header('Pragma', 'no-cache')
  async getPublicConfig() {
    const configs = await this.systemService.getAllConfigs()

    // 组装前端需要的格式
    const result = {
      splashText: configs.basic?.splashText || '正在寻找你的缘分...',
      appName: configs.basic?.appName ?? '栖缘社',
      shareTitle: configs.share?.shareTitle || '栖缘社 - 遇见对的TA',
      shareDesc: configs.share?.desc || '专业的婚恋匹配平台，为你找到最合适的另一半',
      matchmakers: configs.basic?.matchmakers || [],
      vipAgreement: configs.basic?.vipAgreement || '',
      userAgreement: configs.basic?.userAgreement || '',
      privacyPolicy: configs.basic?.privacyPolicy || '',
    }

    return Result.success(result)
  }
}
