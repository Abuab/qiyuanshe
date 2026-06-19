import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { AiCallLog } from '../entities/AiCallLog'
import { AiMatchReport } from '../entities/AiMatchReport'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { AiConfigService } from './ai-config.service'
import { AiMatchService } from './ai-match.service'
import { AdminAiController } from './admin-ai.controller'
import { PublicAiController } from './public-ai.controller'
import { AiMatchController } from './ai-match.controller'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [TypeOrmModule.forFeature([
    SystemConfig, AiFeatureSwitchLog, AiCallLog, AiMatchReport,
    User, UserTagSelection, QuestionAnswer,
  ])],
  controllers: [AdminAiController, PublicAiController, AiMatchController],
  providers: [AiConfigService, AiMatchService, RedisService],
  exports: [AiConfigService],
})
export class AiModule {}
