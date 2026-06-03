import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ConfigModule } from '@nestjs/config'
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
import { HealthController } from './health.controller'
import { AdminModule } from './admin/admin.module'
import { RedisService } from './common/redis.service'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  ],
  controllers: [HealthController],
  providers: [RedisService],
  exports: [TypeOrmModule, RedisService, AuthModule, UserModule, MatchmakerModule, PosterModule, QuestionModule, PaymentModule, ChatModule, AuditModule, AdminModule, SystemModule],
})
export class AppModule {}
