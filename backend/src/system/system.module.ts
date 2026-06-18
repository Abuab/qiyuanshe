import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PublicSystemController } from './system.controller'
import { SystemService } from './system.service'
import { SystemConfig } from '../entities/SystemConfig'
import { VipModule } from '../vip/vip.module'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig]), VipModule],
  controllers: [PublicSystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
