import { Module, Global } from '@nestjs/common'
import { CosService } from './cos.service'
import { CosController } from './cos.controller'

@Global()
@Module({
  controllers: [CosController],
  providers: [CosService],
  exports: [CosService],
})
export class CosModule {}
