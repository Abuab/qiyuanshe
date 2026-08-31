import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PublicSystemController } from './system.controller'
import { SystemService } from './system.service'
import { SystemConfig } from '../entities/SystemConfig'
import { VipModule } from '../vip/vip.module'
import { LicenseModule } from '../license/license.module'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig]), forwardRef(() => VipModule), LicenseModule],
  controllers: [PublicSystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
