import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SystemController, PublicSystemController } from './system.controller'
import { SystemService } from './system.service'
import { SystemConfig } from '../entities/SystemConfig'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [SystemController, PublicSystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
