import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  HotQuestion,
  QuestionAnswer,
  User,
  AuditLog,
} from '../entities'
import { QuestionController } from './question.controller'
import { QuestionService } from './question.service'
import { DynamicModule } from '../dynamic/dynamic.module'
import { AdminModule } from '../admin/admin.module'
import { AuditModule } from '../audit/audit.module'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotQuestion,
      QuestionAnswer,
      User,
      AuditLog,
    ]),
    DynamicModule,
    AdminModule,
    AuditModule,
    SystemModule,
  ],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
