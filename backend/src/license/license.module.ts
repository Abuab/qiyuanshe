import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_GUARD } from '@nestjs/core'
import { SystemConfig } from '../entities/SystemConfig'
import { LicenseService } from './license.service'
import { LicenseGuard } from './license.guard'

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [
    LicenseService,
    LicenseGuard,
    // 注册为全局守卫：所有路由都会经过，但仅 @RequireLicense() 标注的接口才校验
    { provide: APP_GUARD, useClass: LicenseGuard },
  ],
  exports: [LicenseService],
})
export class LicenseModule {}
