import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Circle } from '../entities/Circle'
import { CirclePost } from '../entities/CirclePost'
import { User } from '../entities/User'
import { CircleService } from './circle.service'
import { CircleController, AdminCircleController } from './circle.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Circle, CirclePost, User])],
  controllers: [CircleController, AdminCircleController],
  providers: [CircleService],
  exports: [CircleService],
})
export class CircleModule {}
