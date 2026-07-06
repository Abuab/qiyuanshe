import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemModule } from '../system/system.module'
import { CopySlot } from './entities/CopySlot'
import { CopyItem } from './entities/CopyItem'
import { CopyStat } from './entities/CopyStat'
import { CopyExposureLog } from './entities/CopyExposureLog'
import { User } from '../entities/User'
import { PersonalityResult } from '../personality-test/entities/PersonalityResult'
import { GuideConfigService } from './guide-config.service'
import { CopySlotService } from './copy-slot.service'
import { CopyItemService } from './copy-item.service'
import { CopyResolveService } from './copy-resolve.service'
import { CopyStatsService } from './copy-stats.service'
import { GuideCopySeeder } from './guide-copy.seeder'
import { AdminGuideController } from './admin-guide.controller'
import { PublicGuideController } from './public-guide.controller'

/**
 * 引导文案配置中心模块
 *
 * - 文案位/文案 CRUD、数据看板（Admin）
 * - 文案解析、曝光/点击/登录转化上报、浮动按钮配置（小程序端）
 * User / PersonalityResult 实体只读复用（用于受众定向），不改动其表结构。
 */
@Module({
  imports: [
    SystemModule,
    TypeOrmModule.forFeature([
      CopySlot,
      CopyItem,
      CopyStat,
      CopyExposureLog,
      User,
      PersonalityResult,
    ]),
  ],
  controllers: [AdminGuideController, PublicGuideController],
  providers: [
    GuideConfigService,
    CopySlotService,
    CopyItemService,
    CopyResolveService,
    CopyStatsService,
    GuideCopySeeder,
  ],
  exports: [GuideConfigService, CopyResolveService],
})
export class GuideCopyModule {}
