import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserAgreementLog } from '../entities/UserAgreementLog'
import { AgreementLogStorageConfig } from '../entities/AgreementLogStorageConfig'
import { User } from '../entities/User'
import { AgreementLogStorageService } from './agreement-log-storage.service'
import { AdminAgreementLogStorageController } from './admin-agreement-log-storage.controller'
import { PublicAgreementLogController } from './public-agreement-log.controller'
import { LocalStorageStrategy } from './strategies/local-storage.strategy'
import { SlsStorageStrategy } from './strategies/sls-storage.strategy'
import { StorageStrategyFactory } from './strategies/storage-strategy.factory'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAgreementLog, AgreementLogStorageConfig, User]),
  ],
  controllers: [AdminAgreementLogStorageController, PublicAgreementLogController],
  providers: [
    AgreementLogStorageService,
    LocalStorageStrategy,
    SlsStorageStrategy,
    StorageStrategyFactory,
  ],
  exports: [AgreementLogStorageService],
})
export class AgreementLogStorageModule {}
