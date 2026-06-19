import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { AiCallLog } from '../entities/AiCallLog'
import { AiMatchReport } from '../entities/AiMatchReport'
import { AiFunQuizReport } from '../entities/AiFunQuizReport'
import { AiUserProfile } from '../entities/AiUserProfile'
import { ContentSafetyAudit } from '../entities/ContentSafetyAudit'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { ChatMessage } from '../entities/ChatMessage'
import { AiConfigService } from './ai-config.service'
import { AiSafetyService } from './ai-safety.service'
import { AiRateLimitService } from './ai-rate-limit.service'
import { AiMatchService } from './ai-match.service'
import { AiChatSkillService } from './ai-chat-skill.service'
import { AiMatchmakerService } from './ai-matchmaker.service'
import { AiFunQuizService } from './ai-fun-quiz.service'
import { AiProfileGenService } from './ai-profile-gen.service'
import { AdminAiController } from './admin-ai.controller'
import { AdminAiBlacklistController } from './admin-ai-blacklist.controller'
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
    User, UserTagSelection, QuestionAnswer, ChatMessage,
  ])],
  controllers: [
    AdminAiController, AdminAiBlacklistController, PublicAiController,
    AiMatchController, AiChatSkillController, AiMatchmakerController,
    AiFunQuizController, AiProfileGenController,
  ],
  providers: [
    AiConfigService, AiSafetyService, AiRateLimitService,
    AiMatchService, AiChatSkillService, AiMatchmakerService,
    AiFunQuizService, AiProfileGenService,
    RedisService,
  ],
  exports: [AiConfigService, AiRateLimitService],
})
export class AiModule {}
