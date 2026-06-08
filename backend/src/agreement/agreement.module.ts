import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Agreement } from '../entities/Agreement'
import { AgreementService } from './agreement.service'
import { AgreementController } from './agreement.controller'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [TypeOrmModule.forFeature([Agreement]), SystemModule],
  controllers: [AgreementController],
  providers: [AgreementService],
  exports: [AgreementService],
})
export class AgreementModule {}
