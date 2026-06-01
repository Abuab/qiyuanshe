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
    if (payload.type !== 'admin' || payload.role !== 'admin') {
      throw new UnauthorizedException('无效的管理员令牌')
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
