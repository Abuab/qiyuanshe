import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog, UserPhoto, QuestionAnswer, User } from '../entities'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'
import { TencentCloudModerationProvider } from './providers/tencent-cloud-moderation.provider'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      UserPhoto,
      QuestionAnswer,
      User,
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService, TencentCloudModerationProvider],
  exports: [AuditService],
})
export class AuditModule {}
