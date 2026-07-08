import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SinglePromise } from '../entities/SinglePromise'
import { UserAuth } from '../entities/UserAuth'
import { User } from '../entities/User'
import { SinglePromiseController } from './single-promise.controller'
import { SinglePromiseService } from './single-promise.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([SinglePromise, UserAuth, User]), AuthModule],
  controllers: [SinglePromiseController],
  providers: [SinglePromiseService],
  exports: [SinglePromiseService],
})
export class SinglePromiseModule {}
