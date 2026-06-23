import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { VipOrder, VipPackage, User, AuditLog } from '../entities'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { RedisService } from '../common/redis.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipOrder,
      VipPackage,
      User,
      AuditLog,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, RedisService],
  exports: [PaymentService],
})
export class PaymentModule {}
