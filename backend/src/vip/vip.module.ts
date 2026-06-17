import { Module } from '@nestjs/common'
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
import { SystemConfig } from '../entities/SystemConfig'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      VipOrder,
      VipPackage,
      UserTopRecord,
      UserTopCardQuota,
      SystemConfig,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [VipController],
  providers: [VipService, VipScheduler, RedisService],
  exports: [VipService],
})
export class VipModule {}
