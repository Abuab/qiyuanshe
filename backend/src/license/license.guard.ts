import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { LicenseService } from './license.service'
import { REQUIRE_LICENSE_KEY } from './license.decorator'
import { LicenseException } from './license.exception'

/**
 * 全局授权守卫：仅对标注了 @RequireLicense() 的接口生效。
 * 未标注的接口（读接口、认证、管理后台、回调等）一律放行。
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_LICENSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true

    const info = await this.licenseService.getLicenseInfo()
    if (info.status === 'expired') {
      throw new LicenseException('LICENSE_EXPIRED', info.lockMessage)
    }
    if (info.status === 'unauthorized') {
      throw new LicenseException('LICENSE_INVALID', info.lockMessage)
    }
    return true
  }
}
