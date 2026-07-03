import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CosService } from './cos.service'
import { CosController } from './cos.controller'
import { AuthModule } from '../auth/auth.module'
import { UserNotification } from '../entities/UserNotification'

@Global()
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([UserNotification])],
  controllers: [CosController],
  providers: [CosService],
  exports: [CosService],
})
export class CosModule {}
