import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service'
import { ContentFilterService } from './content-filter.service'
import { CryptoService } from './crypto.service'
import { SmsService } from './sms.service'

/**
 * 全局基础设施模块
 *
 * RedisService、ContentFilterService、CryptoService、SmsService 属横切关注点，
 * 被多个业务模块共享使用。作为全局单例是合理做法，
 * 但应从 AppModule 中剥离，避免 AppModule 兼具"全局"语义。
 */
@Global()
@Module({
  providers: [RedisService, ContentFilterService, CryptoService, SmsService],
  exports: [RedisService, ContentFilterService, CryptoService, SmsService],
})
export class CommonModule {}
