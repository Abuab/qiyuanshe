import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog, UserPhoto, QuestionAnswer, User } from '../entities'
import { NotifyLog } from '../entities/NotifyLog'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'
import { TencentCloudModerationProvider } from './providers/tencent-cloud-moderation.provider'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      UserPhoto,
      QuestionAnswer,
      User,
      NotifyLog,
    ]),
    SystemModule,
  ],
  controllers: [AuditController],
  providers: [AuditService, TencentCloudModerationProvider],
  exports: [AuditService],
})
export class AuditModule {}
