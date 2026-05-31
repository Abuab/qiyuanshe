import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CaptchaService } from './captcha.service'
import { Result } from '../common/result'

interface LoginDto {
  username: string
  password: string
  captcha: string
  captchaKey?: string
}

@Controller('admin')
export class AdminLoginController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { username, password, captcha, captchaKey } = dto

    if (!captcha) {
      throw new UnauthorizedException('请输入验证码')
    }

    if (!captchaKey) {
      throw new UnauthorizedException('验证码已过期，请刷新')
    }

    const isValid = this.captchaService.verifyCaptcha(captchaKey, captcha)
    
    if (!isValid) {
      throw new UnauthorizedException('验证码错误')
    }

    if (username !== 'admin' || password !== '123456') {
      throw new UnauthorizedException('用户名或密码错误')
    }

    const payload = { sub: 1, username: 'admin', role: 'admin' }
    const token = this.jwtService.sign(payload)

    const user = {
      id: 1,
      username: 'admin',
      nickname: '管理员',
      role: 'admin',
      avatar: '',
    }

    const permissions = ['user:list', 'user:edit', 'matchmaker:list', 'matchmaker:edit', 'question:list', 'question:edit', 'audit:list', 'audit:edit', 'payment:list', 'dashboard']

    return Result.success({ token, user, permissions })
  }
}