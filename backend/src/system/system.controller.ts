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
      icons: this.buildIconConfig(configs.icon || {}),
    }

    return Result.success(result)
  }

  private buildIconConfig(raw: Record<string, any>) {
    const fallback = (v: any) => (v ? String(v) : '')
    const tabbar = raw.tabbar || {}
    const menu = raw.menu || {}
    const page = raw.page || {}

    return {
      tabbar: {
        home: {
          default: fallback(tabbar.home?.default),
          active: fallback(tabbar.home?.active),
        },
        dynamic: {
          default: fallback(tabbar.dynamic?.default),
          active: fallback(tabbar.dynamic?.active),
        },
        vip: {
          default: fallback(tabbar.vip?.default),
          active: fallback(tabbar.vip?.active),
        },
        message: {
          default: fallback(tabbar.message?.default),
          active: fallback(tabbar.message?.active),
        },
        my: {
          default: fallback(tabbar.my?.default),
          active: fallback(tabbar.my?.active),
        },
      },
      menu: {
        vipCenter: fallback(menu.vipCenter),
        activities: fallback(menu.activities),
        answers: fallback(menu.answers),
        follows: fallback(menu.follows),
        visitors: fallback(menu.visitors),
        photos: fallback(menu.photos),
        realnameAuth: fallback(menu.realnameAuth),
        help: fallback(menu.help),
        settings: fallback(menu.settings),
      },
      page: {
        dynamicHome: fallback(page.dynamicHome),
      },
    }
  }

  /** 获取选项字典（职业、我的特点、希望TA等） */
  @Get('dicts')
  @Header('Cache-Control', 'public, max-age=300')
  async getDicts() {
    const dicts = await this.systemService.getDicts()
    return Result.success(dicts)
  }
}
