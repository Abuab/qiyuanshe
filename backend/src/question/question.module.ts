import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  HotQuestion,
  QuestionAnswer,
  User,
  AnswerLike,
} from '../entities'
import { QuestionController, AnswerController } from './question.controller'
import { QuestionService } from './question.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotQuestion,
      QuestionAnswer,
      User,
      AnswerLike,
    ]),
  ],
  controllers: [QuestionController, AnswerController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
