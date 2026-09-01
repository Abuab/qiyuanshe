import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { LicenseService } from './license.service'

/**
 * 管理后台授权守卫：对 /admin/* 路由进行 License 校验。
 * - 未激活/过期时返回 403，阻止管理后台业务操作（防破解）
 * - 白名单放行登录、验证码、MFA、刷新令牌、登出、以及授权激活/状态接口，
 *   保证未激活时管理员仍能登录并进入「系统授权」页面完成激活，避免死锁。
 */
const BYPASS_PATH_MARKERS = [
  '/admin/login',
  '/admin/captcha',
  '/admin/mfa/login-verify',
  '/admin/auth/refresh',
  '/admin/logout',
  '/admin/license',
]

@Injectable()
export class AdminLicenseGuard implements CanActivate {
  constructor(private readonly licenseService: LicenseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const path = String(req?.originalUrl || req?.url || '').split('?')[0]

    if (!path.includes('/admin/') && !path.endsWith('/admin')) {
      return true
    }
    if (BYPASS_PATH_MARKERS.some((marker) => path.includes(marker))) {
      return true
    }

    const info = await this.licenseService.getLicenseInfo()
    if (info.status === 'expired' || info.status === 'unauthorized') {
      throw new ForbiddenException(info.lockMessage || '系统授权已过期，请联系管理员')
    }
    return true
  }
}
