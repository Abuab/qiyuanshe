import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VipOrder, User, AuditLog } from '../entities'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipOrder,
      User,
      AuditLog,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
