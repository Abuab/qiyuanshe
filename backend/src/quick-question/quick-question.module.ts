import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QuickQuestion } from '../entities/QuickQuestion'
import { QuickQuestionCategory } from '../entities/QuickQuestionCategory'
import { QuickQuestionService } from './quick-question.service'
import { AdminQuickQuestionController } from './admin-quick-question.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([QuickQuestion, QuickQuestionCategory]),
  ],
  controllers: [AdminQuickQuestionController],
  providers: [QuickQuestionService],
  exports: [QuickQuestionService],
})
export class QuickQuestionModule {}
