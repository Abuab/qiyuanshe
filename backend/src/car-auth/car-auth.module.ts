import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserAuth } from '../entities/UserAuth'
import { CarAuthController } from './car-auth.controller'
import { CarAuthService } from './car-auth.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserAuth])],
  controllers: [CarAuthController],
  providers: [CarAuthService],
})
export class CarAuthModule {}
