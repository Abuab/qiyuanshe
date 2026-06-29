import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { VipController } from './vip.controller'
import { VipService } from './vip.service'
import { VipScheduler } from './vip.scheduler'
import { User } from '../entities/User'
import { VipOrder } from '../entities/VipOrder'
import { VipPackage } from '../entities/VipPackage'
import { UserTopRecord } from '../entities/UserTopRecord'
import { UserTopCardQuota } from '../entities/UserTopCardQuota'
import { UserRedLineQuota } from '../entities/UserRedLineQuota'
import { RedLineUsage } from '../entities/RedLineUsage'
import { SystemConfig } from '../entities/SystemConfig'
import { RedisService } from '../common/redis.service'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      VipOrder,
      VipPackage,
      UserTopRecord,
      UserTopCardQuota,
      UserRedLineQuota,
      RedLineUsage,
      SystemConfig,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => SystemModule),
  ],
  controllers: [VipController],
  providers: [VipService, VipScheduler, RedisService],
  exports: [VipService],
})
export class VipModule {}
