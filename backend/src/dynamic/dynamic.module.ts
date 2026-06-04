import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Dynamic } from '../entities/Dynamic'
import { DynamicLike } from '../entities/DynamicLike'
import { DynamicController } from './dynamic.controller'
import { DynamicService } from './dynamic.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Dynamic, DynamicLike]),
  ],
  controllers: [DynamicController],
  providers: [DynamicService],
  exports: [DynamicService],
})
export class DynamicModule {}
