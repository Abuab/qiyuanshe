import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  HotQuestion,
  QuestionAnswer,
  User,
  AnswerLike,
  AuditLog,
} from '../entities'
import { QuestionController, AnswerController } from './question.controller'
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
      AnswerLike,
      AuditLog,
    ]),
    DynamicModule,
    AdminModule,
    AuditModule,
    SystemModule,
  ],
  controllers: [QuestionController, AnswerController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
