import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../entities/User'
import { UserAuth } from '../entities/UserAuth'
import { EidAuthController } from './eid-auth.controller'
import { EidAuthService } from './eid-auth.service'
import { SystemModule } from '../system/system.module'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAuth]), SystemModule, AdminModule],
  controllers: [EidAuthController],
  providers: [EidAuthService],
  exports: [EidAuthService],
})
export class EidAuthModule {}
