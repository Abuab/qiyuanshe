import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopySlot, CopyDisplayMode } from './entities/CopySlot'
import { CopyItem } from './entities/CopyItem'

/**
 * 引导文案 - 默认数据 Seeder
 *
 * 系统启动时，若文案位表为空则写入预置系统文案位（isSystem=1），
 * 并为每个文案位写入一条默认启用文案，保证前端各入口开箱即用。
 */
@Injectable()
export class GuideCopySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(GuideCopySeeder.name)

  private static readonly SLOTS: Array<{
    code: string
    name: string
    pageLocation: string
    displayMode: CopyDisplayMode
    sort: number
    defaultMain: string
    defaultSub: string | null
  }> = [
    { code: 'home_floating_button', name: '首页浮动按钮', pageLocation: '首页右侧浮动按钮', displayMode: 'carousel', sort: 1, defaultMain: '测一测', defaultSub: '发现你的性格' },
    { code: 'result_login_guide', name: '结果页登录引导', pageLocation: '测试结果页', displayMode: 'ab_test', sort: 2, defaultMain: '登录查看完整解析', defaultSub: '解锁你的专属性格报告' },
    { code: 'result_retest', name: '结果页重新测试', pageLocation: '测试结果页', displayMode: 'carousel', sort: 3, defaultMain: '重新测试', defaultSub: '状态变了？再测一次' },
    { code: 'detail_match_guide', name: '详情页匹配引导', pageLocation: '用户详情页', displayMode: 'carousel', sort: 4, defaultMain: '看看你们的性格契合度', defaultSub: null },
    { code: 'mine_personality_entry', name: '我的页面性格入口', pageLocation: '我的页面', displayMode: 'carousel', sort: 5, defaultMain: '我的性格测试', defaultSub: null },
  ]

  constructor(
    @InjectRepository(CopySlot)
    private readonly slotRepo: Repository<CopySlot>,
    @InjectRepository(CopyItem)
    private readonly itemRepo: Repository<CopyItem>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const count = await this.slotRepo.count()
      if (count > 0) return
      for (const s of GuideCopySeeder.SLOTS) {
        const slot = await this.slotRepo.save(
          this.slotRepo.create({
            code: s.code,
            name: s.name,
            pageLocation: s.pageLocation,
            remark: null,
            displayMode: s.displayMode,
            isSystem: 1,
            isEnabled: 1,
            sort: s.sort,
          }),
        )
        await this.itemRepo.save(
          this.itemRepo.create({
            slotId: slot.id,
            mainText: s.defaultMain,
            subText: s.defaultSub,
            weight: 50,
            targetLoginState: null,
            targetGender: null,
            targetTested: null,
            isEnabled: 1,
            sort: 1,
          }),
        )
      }
      this.logger.log(`已初始化 ${GuideCopySeeder.SLOTS.length} 个引导文案位及默认文案`)
    } catch (e: any) {
      this.logger.warn(`引导文案基础数据初始化失败: ${e?.message}`)
    }
  }
}
