import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Circle } from '../entities/Circle'
import { CirclePost } from '../entities/CirclePost'
import { CircleMember } from '../entities/CircleMember'
import { User } from '../entities/User'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { CircleService } from './circle.service'
import { CircleController, AdminCircleController } from './circle.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Circle, CirclePost, CircleMember, User, MatchmakerComment])],
  controllers: [CircleController, AdminCircleController],
  providers: [CircleService],
  exports: [CircleService],
})
export class CircleModule {}
