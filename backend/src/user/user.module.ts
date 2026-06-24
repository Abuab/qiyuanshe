import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User, UserPhoto, Follow, Notice, Report, ProfileVisit, UserBlock, AuditLog } from '../entities'
import { UserNotification } from '../entities/UserNotification'
import { UserAuth } from '../entities/UserAuth'
import { UserTagSelection } from '../entities/UserTagSelection'
import { AiUserProfile } from '../entities/AiUserProfile'
import { AiMatchReport } from '../entities/AiMatchReport'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { UserAgreement } from '../entities/UserAgreement'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserProfileDetailService } from './user-profile-detail.service'
import { RecommendService } from './recommend.service'
import { UserNoticeController } from './notice.controller'
import { UserNotificationController } from './notification.controller'
import { SystemModule } from '../system/system.module'
import { DynamicModule } from '../dynamic/dynamic.module'
import { AdminModule } from '../admin/admin.module'
import { AiModule } from '../ai/ai.module'
import { AgreementLogStorageModule } from '../agreement-log-storage/agreement-log-storage.module'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, UserPhoto, Follow, Notice, Report, UserNotification,
      UserAuth, UserTagSelection, AiUserProfile, AiMatchReport,
      QuestionAnswer, ProfileVisit, UserBlock, AuditLog, MatchmakerComment, UserAgreement,
    ]),
    SystemModule, DynamicModule, AdminModule, AiModule, AgreementLogStorageModule,
  ],
  controllers: [UserController, UserNoticeController, UserNotificationController],
  providers: [UserService, UserProfileDetailService, RecommendService, RedisService],
  exports: [UserService, RecommendService],
})
export class UserModule {}
