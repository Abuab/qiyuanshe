import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { Matchmaker } from '../entities/Matchmaker'
import { User } from '../entities/User'
import { MatchRecord } from '../entities/MatchRecord'
import { MatchmakerCommentService } from './matchmaker-comment.service'
import { MatchmakerCommentController, AdminMatchmakerCommentController } from './matchmaker-comment.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MatchmakerComment, Matchmaker, User, MatchRecord])],
  controllers: [MatchmakerCommentController, AdminMatchmakerCommentController],
  providers: [MatchmakerCommentService],
  exports: [MatchmakerCommentService],
})
export class MatchmakerCommentModule {}
