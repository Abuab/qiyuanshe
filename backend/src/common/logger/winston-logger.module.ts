import { Global, Module } from '@nestjs/common'
import { WinstonLoggerService } from './winston-logger.service'
import { RequestIdMiddleware } from './request-id.middleware'

@Global()
@Module({
  providers: [WinstonLoggerService, RequestIdMiddleware],
  exports: [WinstonLoggerService, RequestIdMiddleware],
})
export class WinstonLoggerModule {}
