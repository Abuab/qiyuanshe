import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../auth/guards'
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
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { Matchmaker } from '../entities/Matchmaker'
import { HotQuestion } from '../entities/HotQuestion'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { VipOrder } from '../entities/VipOrder'
import { AuditLog } from '../entities/AuditLog'

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
    ]),
  ],
  controllers: [
    AdminUserController,
    AdminMatchmakerController,
    AdminQuestionController,
    AdminAuditController,
    AdminPaymentController,
    AdminDashboardController,
  ],
  providers: [
    AdminUserService,
    AdminMatchmakerService,
    AdminQuestionService,
    AdminAuditService,
    AdminPaymentService,
    AdminDashboardService,
  ],
  exports: [
    AdminUserService,
    AdminMatchmakerService,
    AdminQuestionService,
    AdminAuditService,
    AdminPaymentService,
    AdminDashboardService,
  ],
})
export class AdminModule {}
