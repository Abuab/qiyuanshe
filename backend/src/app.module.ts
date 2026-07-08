import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { join } from 'path'
import { databaseConfig } from './config/database'
import {
  User,
  UserPhoto,
  UserAuth,
  HotQuestion,
  QuestionAnswer,
  AnswerLike,
  Matchmaker,
  SystemConfig,
  VipOrder,
  ChatMessage,
  AuditLog,
  Follow,
  Notice,
  Report,
  AdminUser,
  UserNotification,
  MatchmakerReview,
  MatchRecord,
  UserBlock,
  Dynamic,
  DynamicLike,
  Agreement,
  MatchmakerComment,
  Circle,
  CirclePost,
  SuccessCase,
  UserRedLineQuota,
  RedLineUsage,
  UserRedLineUsageRecord,
  UserSystemTag,
  UserTagSelection,
  AiUserProfile,
  AiCallLog,
  ContentSafetyAudit,
  AiFeatureSwitchLog,
  AiMatchReport,
  AiFunQuizReport,
  QuickQuestion,
  QuickQuestionCategory,
  UserAgreement,
  Feedback,
  SinglePromise,
} from './entities'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { MatchmakerModule } from './matchmaker/matchmaker.module'
import { PosterModule } from './poster/poster.module'
import { QuestionModule } from './question/question.module'
import { PaymentModule } from './payment/payment.module'
import { ChatModule } from './chat/chat.module'
import { AuditModule } from './audit/audit.module'
import { SystemModule } from './system/system.module'
import { ActivityModule } from './activity/activity.module'
import { UploadModule } from './upload/upload.module'
import { DynamicModule } from './dynamic/dynamic.module'
import { AgreementModule } from './agreement/agreement.module'
import { RegionModule } from './region/region.module'
import { CircleModule } from './circle/circle.module'
import { SuccessCaseModule } from './success-case/success-case.module'
import { MatchmakerCommentModule } from './matchmaker-comment/matchmaker-comment.module'
import { AiModule } from './ai/ai.module'
import { QuickQuestionModule } from './quick-question/quick-question.module'
import { AgreementLogStorageModule } from './agreement-log-storage/agreement-log-storage.module'
import { SinglePromiseModule } from './single-promise/single-promise.module'
import { EducationAuthModule } from './education-auth/education-auth.module'
import { PersonalityTestModule } from './personality-test/personality-test.module'
import { GuideCopyModule } from './guide-copy/guide-copy.module'
import { HealthController } from './health.controller'
import { AdminModule } from './admin/admin.module'
import { VipModule } from './vip/vip.module'
import { CosModule } from './cos/cos.module'
import { RedisService } from './common/redis.service'
import { DatabaseIndexService } from './common/database-index.service'

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 时间窗口 60 秒
      limit: 60,    // 每个窗口最多 60 次请求（公开接口可单独覆盖为更低值）
    }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '.env'),
      load: [databaseConfig],
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    TypeOrmModule.forFeature([
      User,
      UserPhoto,
      UserAuth,
      HotQuestion,
      QuestionAnswer,
      AnswerLike,
      Matchmaker,
      SystemConfig,
      VipOrder,
      ChatMessage,
      AuditLog,
      Follow,
      Notice,
      Report,
      AdminUser,
      UserNotification,
      MatchmakerReview,
      MatchRecord,
      UserBlock,
      Dynamic,
      DynamicLike,
      Agreement,
      MatchmakerComment,
      Circle,
      CirclePost,
      SuccessCase,
      UserRedLineQuota,
      RedLineUsage,
      UserRedLineUsageRecord,
      UserSystemTag,
      UserTagSelection,
      AiUserProfile,
      AiCallLog,
      ContentSafetyAudit,
      AiFeatureSwitchLog,
      AiMatchReport,
      AiFunQuizReport,
      QuickQuestion,
      QuickQuestionCategory,
      UserAgreement,
      Feedback,
      SinglePromise,
    ]),
    // 静态资源通过 main.ts 中的 app.useStaticAssets 配置
    // ServeStaticModule 在部分 NestJS 版本中可能与 useStaticAssets 冲突
    // 统一使用 main.ts 中的配置
    AuthModule,
    UserModule,
    MatchmakerModule,
    PosterModule,
    QuestionModule,
    PaymentModule,
    ChatModule,
    AuditModule,
    AdminModule,
    SystemModule,
    ActivityModule,
    UploadModule,
    DynamicModule,
    AgreementModule,
    RegionModule,
    CircleModule,
    SuccessCaseModule,
    MatchmakerCommentModule,
    VipModule,
    AiModule,
    QuickQuestionModule,
    AgreementLogStorageModule,
    SinglePromiseModule,
    EducationAuthModule,
    PersonalityTestModule,
    GuideCopyModule,
    CosModule,
  ],
  controllers: [HealthController],
  providers: [RedisService, DatabaseIndexService],
  exports: [TypeOrmModule, RedisService, AuthModule, UserModule, MatchmakerModule, PosterModule, QuestionModule, PaymentModule, ChatModule, AuditModule, AdminModule, SystemModule, AgreementModule, AgreementLogStorageModule],
})
export class AppModule {}
