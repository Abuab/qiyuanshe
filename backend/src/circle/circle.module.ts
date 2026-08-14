import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Circle } from '../entities/Circle'
import { CircleMember } from '../entities/CircleMember'
import { User } from '../entities/User'
import { MatchmakerComment } from '../entities/MatchmakerComment'
import { Follow } from '../entities/Follow'
import { CircleService } from './circle.service'
import { CircleController, AdminCircleController } from './circle.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Circle, CircleMember, User, MatchmakerComment, Follow])],
  controllers: [CircleController, AdminCircleController],
  providers: [CircleService],
  exports: [CircleService],
})
export class CircleModule {}
