import {
  Controller,
  Get,
  Header,
} from '@nestjs/common'
import { SystemService } from './system.service'
import { VipService } from '../vip/vip.service'
import { Result } from '../common/result'

/**
 * 公开系统配置接口（供小程序前端调用，无需登录）
 * 注意：管理后台的 /admin/system/* 路由由 AdminSystemController 处理
 */
@Controller('system')
export class PublicSystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly vipService: VipService,
  ) {}

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
      matchmakerHiText: configs.basic?.matchmakerHiText || 'Hi',
      matchmakerShowHi: configs.basic?.matchmakerShowHi !== undefined ? configs.basic?.matchmakerShowHi : true,
      matchmakerButtonText: configs.basic?.matchmakerButtonText || '红娘',
      quickEntryNames: configs.basic?.quickEntryNames || ['红娘评语', '最新活动', '相亲圈子', '我们脱单了'],
      followEmptyText: configs.basic?.followEmptyText || '您还木有关注任何人~',
      followerEmptyText: configs.basic?.followerEmptyText || '还木有人关注您~',
      loveQuotes: Array.isArray(configs.loveQuotes?.quotes) ? configs.loveQuotes.quotes : [],
      redLineTerm: await this.vipService.getRedLineTerm(),
      vipCardTexts: configs.basic?.vipCardTexts || ['限时特惠，尊享VIP特权', '每日签到领金币，解锁更多功能', '开通VIP，优先匹配心仪TA'],
      icons: this.buildIconConfig(configs.icon || {}),
      // AI 红娘安全提示标签（后台可配置）
      matchmakerSafetyLabel: configs.matchmaker?.safetyLabel || '内容提示',
      matchmakerSafetyBoundaryLabel: configs.matchmaker?.safetyBoundaryLabel || '安全提醒',
      // 公众号关注提示开关（运营配置）
      showOfficialAccountPrompt: configs.basic?.showOfficialAccountPrompt !== false,
      // 登录页插画配置
      loginPageIllustration: configs.basic?.loginPageIllustration || '',
      // 照片区引导文案配置
      photoGuidanceLoginPrompt: configs.basic?.photoGuidanceLoginPrompt || '登录后即可查看全部照片~',
      photoGuidanceLoginBtn: configs.basic?.photoGuidanceLoginBtn || '去登录',
      photoGuidanceUploadPrompt: configs.basic?.photoGuidanceUploadPrompt || '上传你的照片，探索更多可能~',
      photoGuidanceUploadBtn: configs.basic?.photoGuidanceUploadBtn || '上传照片',
      photoGuidanceMinCount: Number(configs.basic?.photoGuidanceMinCount ?? 1),
      // 功能开关
      chatEnabled: configs.basic?.chatEnabled !== false,
      vipEnabled: configs.basic?.vipEnabled !== false,
      // 默认头像（管理后台可配置，为空则前端使用内置默认图）
      defaultAvatar: configs.basic?.defaultAvatar || '',
      // 留言功能开关（我的喜欢-互相喜欢 去留言按钮）
      leaveMessageEnabled: configs.basic?.leaveMessageEnabled !== false,
      // 到店认证门店配置
      storeCert: {
        name: configs.storeCert?.name || '',
        address: configs.storeCert?.address || '',
        latitude: parseFloat(configs.storeCert?.latitude) || 0,
        longitude: parseFloat(configs.storeCert?.longitude) || 0,
      },
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
        copy: fallback(page.copy),
        heartFill: fallback(page.heartFill),
        dynamicHome: fallback(page.dynamicHome),
        // 我的页面 - 问答/红娘
        qaIcon: fallback(page.qaIcon),
        matchmakerIcon: fallback(page.matchmakerIcon),
        // 我的页面 - 公众号/底部心形
        oaHeart: fallback(page.oaHeart),
        footerHeart: fallback(page.footerHeart),
        // 我的页面 - 7个工具图标
        myPhotos: fallback(page.myPhotos),
        loveQuotes: fallback(page.loveQuotes),
        myGifts: fallback(page.myGifts),
        privacy: fallback(page.privacy),
        feedback: fallback(page.feedback),
        userAgreement: fallback(page.userAgreement),
        antiFraud: fallback(page.antiFraud),
        // 红娘弹窗图标
        copyIcon: fallback(page.copyIcon),
        saveIcon: fallback(page.saveIcon),
        // 用户详情页图标
        shareFriendIcon: fallback(page.shareFriendIcon),
        posterIcon: fallback(page.posterIcon),
        shareMoreIcon: fallback(page.shareMoreIcon),
        followIcon: fallback(page.followIcon),
        shareBtnIcon: fallback(page.shareBtnIcon),
        // 动态页图标
        mmEye: fallback(page.mmEye),
        // 消息页图标
        systemNotify: fallback(page.systemNotify),
        // 用户卡片图标
        realNameIcon: fallback(page.realNameIcon),
        // 编辑资料-删除照片图标
        deletePhotoIcon: fallback(page.deletePhotoIcon),
        // 关注/粉丝空状态图标
        followEmptyIcon: fallback(page.followEmptyIcon),
        // 隐私设置页图标
        blockListIcon: fallback(page.blockListIcon),
        privacyPolicyIcon: fallback(page.privacyPolicyIcon),
        privacySettingIcon: fallback(page.privacySettingIcon),
        deactivateIcon: fallback(page.deactivateIcon),
        selfDisciplineIcon: fallback(page.selfDisciplineIcon),
        // 爱情语录图标
        refreshIcon: fallback(page.refreshIcon),
        filterResetIcon: fallback(page.filterResetIcon),
        // 实名认证页 - 6个认证项图标
        certRealnameIcon: fallback(page.certRealnameIcon),
        certSingleIcon: fallback(page.certSingleIcon),
        certEducationIcon: fallback(page.certEducationIcon),
        certHouseIcon: fallback(page.certHouseIcon),
        certCarIcon: fallback(page.certCarIcon),
        certStoreIcon: fallback(page.certStoreIcon),
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
