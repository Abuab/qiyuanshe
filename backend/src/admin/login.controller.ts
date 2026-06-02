import { Controller, Post, Body } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { CaptchaService } from './captcha.service'
import { MfaService } from './mfa.service'
import { adminJwtConfig } from '../config/jwt'
import { User } from '../entities/User'

interface LoginDto {
  username: string
  password: string
  captcha: string
  captchaKey?: string
}

interface MfaLoginVerifyDto {
  tempToken: string
  code: string
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
    private readonly mfaService: MfaService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.doLogin(dto)
  }

  @Post('mfa/login-verify')
  async mfaLoginVerify(@Body() dto: MfaLoginVerifyDto) {
    return this.doMfaLoginVerify(dto)
  }

  private async doMfaLoginVerify(dto: MfaLoginVerifyDto) {
    const { tempToken, code } = dto

    let payload: any
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: process.env.JWT_MFA_SECRET || adminJwtConfig.secret,
      })
    } catch {
      return { success: false, message: '临时令牌已过期，请重新登录' }
    }

    if (payload.type !== 'mfa_temp') {
      return { success: false, message: '无效的令牌类型' }
    }

    const valid = await this.mfaService.verifyLoginMfa(payload.userId, code)
    if (!valid) {
      return { success: false, message: '验证码错误' }
    }

    const dbUser = await this.userRepository.findOne({ where: { id: payload.userId } })
    if (!dbUser) {
      return { success: false, message: '用户不存在' }
    }

    const token = this.jwtService.sign(
      { sub: payload.userId, username: 'admin', role: 'admin', type: 'admin' },
      {
        secret: adminJwtConfig.secret,
        expiresIn: adminJwtConfig.expiresIn,
      },
    )

    const user = {
      id: payload.userId,
      username: 'admin',
      nickname: dbUser.nickname || '管理员',
      role: 'admin',
      avatar: dbUser.avatar || '',
      mfaEnabled: dbUser.isMfaEnabled || false,
      mfaType: dbUser.mfaType || 'none',
    }

    const permissions = ['user:list', 'user:edit', 'matchmaker:list', 'matchmaker:edit', 'question:list', 'question:edit', 'audit:list', 'audit:edit', 'payment:list', 'dashboard']

    return { success: true, token, user, permissions }
  }

  private async doLogin(dto: LoginDto) {
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

    const adminId = 1
    const dbUser = await this.userRepository.findOne({ where: { id: adminId } })

    if (dbUser?.isMfaEnabled) {
      const tempToken = this.jwtService.sign(
        { userId: adminId, type: 'mfa_temp' },
        {
          secret: process.env.JWT_MFA_SECRET || adminJwtConfig.secret,
          expiresIn: '5m',
        },
      )
      return {
        success: true,
        needMfa: true,
        mfaType: dbUser.mfaType,
        phoneMask: dbUser.phone ? `****${dbUser.phone.slice(-4)}` : '',
        tempToken,
      }
    }

    const token = this.jwtService.sign(
      { sub: adminId, username: 'admin', role: 'admin', type: 'admin' },
      {
        secret: adminJwtConfig.secret,
        expiresIn: adminJwtConfig.expiresIn,
      },
    )

    const user = {
      id: adminId,
      username: 'admin',
      nickname: dbUser?.nickname || '管理员',
      role: 'admin',
      avatar: dbUser?.avatar || '',
      mfaEnabled: dbUser?.isMfaEnabled || false,
      mfaType: dbUser?.mfaType || 'none',
    }

    const permissions = ['user:list', 'user:edit', 'matchmaker:list', 'matchmaker:edit', 'question:list', 'question:edit', 'audit:list', 'audit:edit', 'payment:list', 'dashboard']

    return { success: true, token, user, permissions }
  }
}
