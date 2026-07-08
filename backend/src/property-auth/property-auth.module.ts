import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserAuth } from '../entities/UserAuth'
import { PropertyAuthController } from './property-auth.controller'
import { PropertyAuthService } from './property-auth.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserAuth])],
  controllers: [PropertyAuthController],
  providers: [PropertyAuthService],
})
export class PropertyAuthModule {}
