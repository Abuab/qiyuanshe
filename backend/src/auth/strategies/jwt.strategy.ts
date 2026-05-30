import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { jwtConfig } from '../../config/jwt'
import { AuthService } from '../auth.service'

export interface JwtPayload {
  sub: number
  openid: string
  type: 'access' | 'refresh'
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    })
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('无效的访问令牌')
    }

    const user = await this.authService.validateUserById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('用户不存在或已被禁用')
    }

    return user
  }
}
