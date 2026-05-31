import { Controller, Post, Body } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CaptchaService } from './captcha.service'

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
    return this.doLogin(dto)
  }

  private doLogin(dto: LoginDto) {
    const { username, password, captcha, captchaKey } = dto

    if (!captcha) {
      return { success: false, message: '请输入验证码' }
    }

    if (!captchaKey) {
      return { success: false, message: '验证码已过期，请刷新' }
    }

    const isValid = this.captchaService.verifyCaptcha(captchaKey, captcha)
    
    if (!isValid) {
      return { success: false, message: '验证码错误' }
    }

    if (username !== 'admin' || password !== '123456') {
      return { success: false, message: '用户名或密码错误' }
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

    return { success: true, token, user, permissions }
  }
}

@Controller('api')
export class AdminLoginApiController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Post('admin/login')
  async loginApi(@Body() dto: LoginDto) {
    return this.doLogin(dto)
  }

  private doLogin(dto: LoginDto) {
    const { username, password, captcha, captchaKey } = dto

    if (!captcha) {
      return { success: false, message: '请输入验证码' }
    }

    if (!captchaKey) {
      return { success: false, message: '验证码已过期，请刷新' }
    }

    const isValid = this.captchaService.verifyCaptcha(captchaKey, captcha)
    
    if (!isValid) {
      return { success: false, message: '验证码错误' }
    }

    if (username !== 'admin' || password !== '123456') {
      return { success: false, message: '用户名或密码错误' }
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

    return { success: true, token, user, permissions }
  }
}