import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { jwtConfig } from '../config/jwt'

export interface AdminJwtPayload {
  sub: number
  username: string
  role: string
  type?: 'admin'
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    })
  }

  async validate(payload: AdminJwtPayload) {
    // 简化的admin验证，只检查payload结构
    if (payload.sub && payload.username && payload.role === 'admin') {
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      }
    }
    return null
  }
}
