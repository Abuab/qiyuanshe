import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { AiCallLog } from '../entities/AiCallLog'
import { AiMatchReport } from '../entities/AiMatchReport'
import { AiFunQuizReport } from '../entities/AiFunQuizReport'
import { AiUserProfile } from '../entities/AiUserProfile'
import { ContentSafetyAudit } from '../entities/ContentSafetyAudit'
import { AiProviderConfig } from '../entities/AiProviderConfig'
import { AiProviderCallLog } from '../entities/AiProviderCallLog'
import { AiProviderBalance } from '../entities/AiProviderBalance'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { ChatMessage } from '../entities/ChatMessage'
import { AiConfigService } from './ai-config.service'
import { AiApiService } from './ai-api.service'
import { AiSafetyService } from './ai-safety.service'
import { AiRateLimitService } from './ai-rate-limit.service'
import { AiMatchService } from './ai-match.service'
import { AiChatSkillService } from './ai-chat-skill.service'
import { AiMatchmakerService } from './ai-matchmaker.service'
import { AiFunQuizService } from './ai-fun-quiz.service'
import { AiProfileGenService } from './ai-profile-gen.service'
import { AiProviderConfigService } from './ai-provider-config.service'
import { AiProviderSelector } from './ai-provider-selector.service'
import { AiProviderBalanceService } from './ai-provider-balance.service'
import { AiProviderStatsService } from './ai-provider-stats.service'
import { AiProviderScheduler } from './ai-provider.scheduler'
import { AiProviderSeeder } from './ai-provider.seeder'
import { AdminAiController } from './admin-ai.controller'
import { AdminAiBlacklistController } from './admin-ai-blacklist.controller'
import { AdminAiSafetyAuditController } from './admin-ai-safety-audit.controller'
import { AdminAiProviderController } from './admin-ai-provider.controller'
import { PublicAiController } from './public-ai.controller'
import { AiMatchController } from './ai-match.controller'
import { AiChatSkillController } from './ai-chat-skill.controller'
import { AiMatchmakerController } from './ai-matchmaker.controller'
import { AiFunQuizController } from './ai-fun-quiz.controller'
import { AiProfileGenController } from './ai-profile-gen.controller'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [TypeOrmModule.forFeature([
    SystemConfig, AiFeatureSwitchLog, AiCallLog, AiMatchReport,
    AiFunQuizReport, AiUserProfile,
    ContentSafetyAudit,
    AiProviderConfig, AiProviderCallLog, AiProviderBalance,
    User, UserTagSelection, QuestionAnswer, ChatMessage,
  ])],
  controllers: [
    AdminAiController, AdminAiBlacklistController, AdminAiSafetyAuditController,
    AdminAiProviderController, PublicAiController,
    AiMatchController, AiChatSkillController, AiMatchmakerController,
    AiFunQuizController, AiProfileGenController,
  ],
  providers: [
    AiConfigService, AiApiService, AiSafetyService, AiRateLimitService,
    AiMatchService, AiChatSkillService, AiMatchmakerService,
    AiFunQuizService, AiProfileGenService,
    AiProviderConfigService, AiProviderSelector, AiProviderBalanceService,
    AiProviderStatsService, AiProviderScheduler, AiProviderSeeder,
    RedisService,
  ],
  exports: [
    AiConfigService, AiRateLimitService, AiProviderConfigService, AiProviderSelector,
  ],
})
export class AiModule {}
