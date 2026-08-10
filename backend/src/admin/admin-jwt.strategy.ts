import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { adminJwtConfig } from '../config/jwt'
import { ALL_ADMIN_ROLES } from '../shared/enums'
import { AdminAccountService } from './admin-account.service'

export interface AdminJwtPayload {
  sub: number
  username: string
  role: string
  type: string
  tokenVersion?: number
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly adminAccountService: AdminAccountService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: adminJwtConfig.secret,
    })
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.type !== 'admin' && payload.type !== 'admin_access') {
      throw new UnauthorizedException('无效的管理员令牌')
    }

    if (!ALL_ADMIN_ROLES.includes(payload.role)) {
      throw new UnauthorizedException('无效的管理员角色')
    }

    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('无效的管理员令牌')
    }

    // 始终从 DB 读取最新状态：禁用/降权即时生效
    const adminUser = await this.adminAccountService.findById(payload.sub)
    if (!adminUser) {
      throw new UnauthorizedException('管理员账号不存在')
    }

    if (adminUser.status !== 1) {
      throw new UnauthorizedException('管理员账号已被禁用')
    }

    if (payload.tokenVersion !== undefined && adminUser.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('令牌已失效，请重新登录')
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: adminUser.role,
      isAdmin: 1,
    }
  }
}
