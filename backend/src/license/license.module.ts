import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_GUARD } from '@nestjs/core'
import { SystemLicense } from '../entities/SystemLicense'
import { LicenseService, LICENSE_PUBLIC_KEY_TOKEN, LICENSE_PUBLIC_KEY } from './license.service'
import { LicenseGuard } from './license.guard'
import { AdminLicenseGuard } from './admin-license.guard'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemLicense])],
  providers: [
    LicenseService,
    // 生产使用硬编码公钥；测试可覆盖注入临时公钥
    { provide: LICENSE_PUBLIC_KEY_TOKEN, useValue: LICENSE_PUBLIC_KEY },
    LicenseGuard,
    AdminLicenseGuard,
    // 业务写接口守卫：仅 @RequireLicense() 标注的接口校验
    { provide: APP_GUARD, useClass: LicenseGuard },
    // 管理后台守卫：/admin/* 未激活/过期时拦截（白名单放行登录与授权激活）
    { provide: APP_GUARD, useClass: AdminLicenseGuard },
  ],
  exports: [LicenseService],
})
export class LicenseModule {}
