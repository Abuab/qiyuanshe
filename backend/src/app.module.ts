import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ServeStaticModule } from '@nestjs/serve-static'
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
import { HealthController } from './health.controller'
import { AdminModule } from './admin/admin.module'

@Global()
@Module({
  imports: [
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
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
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
  ],
  controllers: [HealthController],
  exports: [TypeOrmModule, AuthModule, UserModule, MatchmakerModule, PosterModule, QuestionModule, PaymentModule, ChatModule, AuditModule, AdminModule, SystemModule],
})
export class AppModule {}
