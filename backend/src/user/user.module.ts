import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User, UserPhoto, Follow, Notice, Report, ProfileVisit, UserBlock, AuditLog } from '../entities'
import { UserNotification } from '../entities/UserNotification'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { RecommendService } from './recommend.service'
import { UserNoticeController } from './notice.controller'
import { UserNotificationController } from './notification.controller'
import { SystemModule } from '../system/system.module'
import { DynamicModule } from '../dynamic/dynamic.module'
import { AdminModule } from '../admin/admin.module'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPhoto, Follow, Notice, Report, UserNotification, QuestionAnswer, ProfileVisit, UserBlock, AuditLog, MatchmakerComment]), SystemModule, DynamicModule, AdminModule],
  controllers: [UserController, UserNoticeController, UserNotificationController],
  providers: [UserService, RecommendService, RedisService],
  exports: [UserService, RecommendService],
})
export class UserModule {}
