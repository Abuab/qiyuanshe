import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AdminUserController } from './user.controller'
import { AdminUserService } from './user.service'
import { AdminMatchmakerController } from './matchmaker.controller'
import { AdminMatchmakerService } from './matchmaker.service'
import { AdminQuestionController } from './question.controller'
import { AdminQuestionService } from './question.service'
import { AdminAuditController } from './audit.controller'
import { AdminAuditService } from './audit.service'
import { AdminPaymentController } from './payment.controller'
import { AdminPaymentService } from './payment.service'
import { AdminDashboardController } from './dashboard.controller'
import { AdminDashboardService } from './dashboard.service'
import { CaptchaController } from './captcha.controller'
import { CaptchaService } from './captcha.service'
import { AdminLoginController } from './login.controller'
import { UploadController } from './upload.controller'
import { AdminSystemController } from './system.controller'
import { AdminSystemService } from './system.service'
import { AdminProfileController } from './profile.controller'
import { AdminProfileService } from './profile.service'
import { MfaController } from './mfa.controller'
import { MfaService } from './mfa.service'
import { ForgotPasswordController } from './forgot-password.controller'
import { AdminNoticeController } from './notice.controller'
import { Notice } from '../entities/Notice'
import { Report } from '../entities/Report'
import { AdminUser as AdminUserEntity } from '../entities/AdminUser'
import { ChatMessage } from '../entities/ChatMessage'
import { UserNotification } from '../entities/UserNotification'
import { MatchmakerReview } from '../entities/MatchmakerReview'
import { MatchRecord } from '../entities/MatchRecord'
import { UserBlock } from '../entities/UserBlock'
import { AdminJwtStrategy } from './admin-jwt.strategy'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { Matchmaker } from '../entities/Matchmaker'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { VipOrder } from '../entities/VipOrder'
import { AuditLog } from '../entities/AuditLog'
import { SystemConfig } from '../entities/SystemConfig'
import { CirclePost } from '../entities/CirclePost'
import { AdminReportController } from './report.controller'
import { AdminChatController } from './chat.controller'
import { AdminChatService } from './chat.service'
import { AdminAccountService } from './admin-account.service'
import { RoleGuard } from './role.guard'
import { UserProfileService } from './user-profile.service'
import { UserProfileController } from './user-profile.controller'
import { AdminMatchmakerDynamicController } from './matchmaker-dynamic.controller'
import { AdminMatchmakerDynamicService } from './matchmaker-dynamic.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPhoto,
      Matchmaker,
      HotQuestion,
      QuestionAnswer,
      VipOrder,
      AuditLog,
      SystemConfig,
      Notice,
      Report,
      AdminUserEntity,
      UserNotification,
      MatchmakerReview,
      MatchRecord,
      UserBlock,
      ChatMessage,
      CirclePost,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'qiyuanshe-jwt-secret-key-2024',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    PassportModule,
  ],
  controllers: [
    AdminUserController,
    AdminMatchmakerController,
    AdminQuestionController,
    AdminAuditController,
    AdminPaymentController,
    AdminDashboardController,
    CaptchaController,
    AdminLoginController,
    UploadController,
    AdminSystemController,
    AdminProfileController,
    MfaController,
    ForgotPasswordController,
    AdminNoticeController,
    AdminReportController,
    AdminChatController,
    UserProfileController,
    AdminMatchmakerDynamicController,
  ],
  providers: [
    AdminUserService,
    AdminMatchmakerService,
    AdminQuestionService,
    AdminAuditService,
    AdminPaymentService,
    AdminDashboardService,
    CaptchaService,
    AdminSystemService,
    AdminProfileService,
    MfaService,
    AdminJwtStrategy,
    AdminJwtAuthGuard,
    AdminAccountService,
    RoleGuard,
    AdminChatService,
    UserProfileService,
    AdminMatchmakerDynamicService,
  ],
  exports: [
    AdminUserService,
    AdminMatchmakerService,
    AdminQuestionService,
    AdminAuditService,
    AdminPaymentService,
    AdminDashboardService,
    CaptchaService,
    AdminSystemService,
    AdminAccountService,
    RoleGuard,
    AdminChatService,
  ],
})
export class AdminModule {}
