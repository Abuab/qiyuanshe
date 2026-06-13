import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User, UserPhoto, Follow, Notice, Report, ProfileVisit, UserBlock, AuditLog } from '../entities'
import { UserNotification } from '../entities/UserNotification'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserNoticeController } from './notice.controller'
import { UserNotificationController } from './notification.controller'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPhoto, Follow, Notice, Report, UserNotification, QuestionAnswer, ProfileVisit, UserBlock, AuditLog, MatchmakerComment]), SystemModule],
  controllers: [UserController, UserNoticeController, UserNotificationController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
