import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SuccessCase } from '../entities/SuccessCase'
import { SystemConfig } from '../entities/SystemConfig'
import { SuccessCaseService } from './success-case.service'
import { SuccessCaseController, AdminSuccessCaseController } from './success-case.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SuccessCase, SystemConfig])],
  controllers: [SuccessCaseController, AdminSuccessCaseController],
  providers: [SuccessCaseService],
  exports: [SuccessCaseService],
})
export class SuccessCaseModule {}
