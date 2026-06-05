import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User, UserPhoto, Follow, Notice, Report } from '../entities'
import { UserNotification } from '../entities/UserNotification'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UserNoticeController } from './notice.controller'
import { UserNotificationController } from './notification.controller'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPhoto, Follow, Notice, Report, UserNotification, QuestionAnswer])],
  controllers: [UserController, UserNoticeController, UserNotificationController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
