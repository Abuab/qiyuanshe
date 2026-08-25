import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VipOrder, VipPackage, User, AuditLog, UserRedLineQuota, UserTopCardQuota } from '../entities'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { SystemModule } from '../system/system.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipOrder,
      VipPackage,
      User,
      AuditLog,
      UserRedLineQuota,
      UserTopCardQuota,
    ]),
    SystemModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
