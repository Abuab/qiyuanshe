import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { adminJwtConfig } from '../config/jwt'

export interface AdminJwtPayload {
  sub: number
  username: string
  role: string
  type: string
}

const VALID_ROLES = ['super_admin', 'matchmaker', 'operator', 'readonly', 'admin']

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: adminJwtConfig.secret,
    })
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('无效的管理员令牌')
    }

    if (!VALID_ROLES.includes(payload.role)) {
      throw new UnauthorizedException('无效的管理员角色')
    }

    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('无效的管理员令牌')
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      isAdmin: 1,
    }
  }
}
