import { Controller, Post, Body } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { CaptchaService } from './captcha.service'
import { adminJwtConfig } from '../config/jwt'

interface LoginDto {
  username: string
  password: string
  captcha: string
  captchaKey?: string
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456'
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000

@Controller('admin')
export class AdminLoginController {
  private loginAttempts = new Map<string, { count: number; blockUntil: number }>()

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

    const attemptRecord = this.loginAttempts.get(username) || { count: 0, blockUntil: 0 }
    if (attemptRecord.blockUntil > Date.now()) {
      return { success: false, message: '登录尝试次数过多，请15分钟后再试' }
    }

    const isValid = this.captchaService.verifyCaptcha(captchaKey, captcha)
    
    if (!isValid) {
      return { success: false, message: '验证码错误' }
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      attemptRecord.count++
      if (attemptRecord.count >= MAX_LOGIN_ATTEMPTS) {
        attemptRecord.blockUntil = Date.now() + LOGIN_BLOCK_DURATION_MS
        attemptRecord.count = 0
      }
      this.loginAttempts.set(username, attemptRecord)
      return { success: false, message: '用户名或密码错误' }
    }

    this.loginAttempts.delete(username)

    const payload = { sub: 1, username: 'admin', role: 'admin', type: 'admin' }
    const token = this.jwtService.sign(payload, {
      secret: adminJwtConfig.secret,
      expiresIn: adminJwtConfig.expiresIn,
    })

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

