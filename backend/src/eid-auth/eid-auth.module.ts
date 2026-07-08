import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../entities/User'
import { EidAuthController } from './eid-auth.controller'
import { EidAuthService } from './eid-auth.service'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [EidAuthController],
  providers: [EidAuthService],
  exports: [EidAuthService],
})
export class EidAuthModule {}
