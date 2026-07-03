import { Module, Global } from '@nestjs/common'
import { CosService } from './cos.service'
import { CosController } from './cos.controller'
import { AuthModule } from '../auth/auth.module'

@Global()
@Module({
  imports: [AuthModule],
  controllers: [CosController],
  providers: [CosService],
  exports: [CosService],
})
export class CosModule {}
