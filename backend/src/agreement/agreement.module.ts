import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Agreement } from '../entities/Agreement'
import { AgreementService } from './agreement.service'
import { AgreementController } from './agreement.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Agreement])],
  controllers: [AgreementController],
  providers: [AgreementService],
  exports: [AgreementService],
})
export class AgreementModule {}
