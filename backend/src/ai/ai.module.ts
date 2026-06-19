import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { AiFeatureSwitchLog } from '../entities/AiFeatureSwitchLog'
import { AiCallLog } from '../entities/AiCallLog'
import { AiMatchReport } from '../entities/AiMatchReport'
import { ContentSafetyAudit } from '../entities/ContentSafetyAudit'
import { User } from '../entities/User'
import { UserTagSelection } from '../entities/UserTagSelection'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { ChatMessage } from '../entities/ChatMessage'
import { AiConfigService } from './ai-config.service'
import { AiSafetyService } from './ai-safety.service'
import { AiMatchService } from './ai-match.service'
import { AiChatSkillService } from './ai-chat-skill.service'
import { AiMatchmakerService } from './ai-matchmaker.service'
import { AdminAiController } from './admin-ai.controller'
import { PublicAiController } from './public-ai.controller'
import { AiMatchController } from './ai-match.controller'
import { AiChatSkillController } from './ai-chat-skill.controller'
import { AiMatchmakerController } from './ai-matchmaker.controller'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [TypeOrmModule.forFeature([
    SystemConfig, AiFeatureSwitchLog, AiCallLog, AiMatchReport,
    ContentSafetyAudit,
    User, UserTagSelection, QuestionAnswer, ChatMessage,
  ])],
  controllers: [
    AdminAiController, PublicAiController,
    AiMatchController, AiChatSkillController, AiMatchmakerController,
  ],
  providers: [
    AiConfigService, AiSafetyService,
    AiMatchService, AiChatSkillService, AiMatchmakerService,
    RedisService,
  ],
  exports: [AiConfigService],
})
export class AiModule {}
