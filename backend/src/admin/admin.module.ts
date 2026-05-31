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
import { CaptchaController, CaptchaFallbackController, CaptchaApiController } from './captcha.controller'
import { CaptchaService } from './captcha.service'
import { AdminLoginController, AdminLoginApiController } from './login.controller'
import { UploadController } from './upload.controller'
import { AdminSystemController } from './system.controller'
import { AdminSystemService } from './system.service'
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
    CaptchaFallbackController,
    CaptchaApiController,
    AdminLoginController,
    AdminLoginApiController,
    UploadController,
    AdminSystemController,
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
    AdminJwtStrategy,
    AdminJwtAuthGuard,
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
  ],
})
export class AdminModule {}
