import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { AiConfigService } from './ai-config.service'
import { AdminAiController } from './admin-ai.controller'
import { PublicAiController } from './public-ai.controller'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig, AiFeatureSwitchLog])],
  controllers: [AdminAiController, PublicAiController],
  providers: [AiConfigService, RedisService],
  exports: [AiConfigService],
})
export class AiModule {}
