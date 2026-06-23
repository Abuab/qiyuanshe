import { Controller, Post, Body, Get, Put, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { CaptchaService } from './captcha.service'
import { MfaService } from './mfa.service'
import { AdminAccountService } from './admin-account.service'
import { RedisService } from '../common/redis.service'
import { adminJwtConfig } from '../config/jwt'
import { AdminRole } from '../entities/AdminUser'

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

interface CreateAdminUserDto {
  username: string
  password: string
  nickname?: string
  role?: AdminRole
  status?: number
}

interface UpdateAdminUserDto {
  username?: string
  password?: string
  nickname?: string
  role?: AdminRole
  status?: number
}

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000
const LOGIN_BLOCK_TTL_SEC = Math.ceil(LOGIN_BLOCK_DURATION_MS / 1000)
const REDIS_KEY_PREFIX = 'admin:login:attempts:'

@Controller('admin')
export class AdminLoginController {
  /** Redis 不可用时降级使用的内存 Map */
  private loginAttemptsFallback = new Map<string, { count: number; blockUntil: number }>()

  constructor(
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
    private readonly mfaService: MfaService,
    private readonly adminAccountService: AdminAccountService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 获取登录尝试记录：优先从 Redis 读取，不可用时降级为内存 Map
   */
  private async getLoginAttempt(username: string): Promise<{ count: number; blockUntil: number }> {
    try {
      const raw = await this.redisService.get(REDIS_KEY_PREFIX + username)
      if (raw) {
        const parsed = JSON.parse(raw)
        // 如果 blockUntil 已过期，返回空记录
        if (parsed.blockUntil && parsed.blockUntil <= Date.now()) return { count: 0, blockUntil: 0 }
        return parsed
      }
      return { count: 0, blockUntil: 0 }
    } catch {
      // Redis 不可用，降级为内存 Map
      return this.loginAttemptsFallback.get(username) || { count: 0, blockUntil: 0 }
    }
  }

  /**
   * 设置登录尝试记录：优先写入 Redis，不可用时降级为内存 Map
   */
  private async setLoginAttempt(username: string, record: { count: number; blockUntil: number }) {
    try {
      await this.redisService.set(
        REDIS_KEY_PREFIX + username,
        JSON.stringify(record),
        LOGIN_BLOCK_TTL_SEC,
      )
    } catch {
      // Redis 不可用，降级为内存 Map
      this.loginAttemptsFallback.set(username, record)
    }
  }

  /**
   * 清除登录尝试记录（登录成功后）
   */
  private async clearLoginAttempt(username: string) {
    try {
      await this.redisService.del(REDIS_KEY_PREFIX + username)
    } catch {
      this.loginAttemptsFallback.delete(username)
    }
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const { username, password, captcha, captchaKey } = dto

    if (!captcha) {
      return { success: false, message: '请输入验证码' }
    }

    if (!captchaKey) {
      return { success: false, message: '验证码已过期，请刷新' }
    }

    const attemptRecord = await this.getLoginAttempt(username)
    if (attemptRecord.blockUntil > Date.now()) {
      return { success: false, message: '登录尝试次数过多，请15分钟后再试' }
    }

    const isCaptchaValid = this.captchaService.verifyCaptcha(captchaKey, captcha)
    if (!isCaptchaValid) {
      return { success: false, message: '验证码错误' }
    }

    const adminUser = await this.adminAccountService.validateUser(username, password)

    if (!adminUser) {
      attemptRecord.count++
      if (attemptRecord.count >= MAX_LOGIN_ATTEMPTS) {
        attemptRecord.blockUntil = Date.now() + LOGIN_BLOCK_DURATION_MS
        attemptRecord.count = 0
      }
      await this.setLoginAttempt(username, attemptRecord)
      return { success: false, message: '用户名或密码错误' }
    }

    await this.clearLoginAttempt(username)

    if (adminUser.isMfaEnabled) {
      const tempToken = this.jwtService.sign(
        { adminId: adminUser.id, type: 'mfa_temp' },
        {
          secret: process.env.JWT_MFA_SECRET || adminJwtConfig.secret,
          expiresIn: '5m',
        },
      )
      return {
        success: true,
        needMfa: true,
        mfaType: 'app',
        phoneMask: username,
        tempToken,
      }
    }

    const token = this.jwtService.sign(
      { sub: adminUser.id, username: adminUser.username, role: adminUser.role, type: 'admin' },
      {
        secret: adminJwtConfig.secret,
        expiresIn: adminJwtConfig.expiresIn,
      },
    )

    const user = {
      id: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname || adminUser.username,
      role: adminUser.role,
      avatar: adminUser.avatar || '',
      mfaEnabled: adminUser.isMfaEnabled || false,
      mfaType: 'none',
    }

    const permissions = this.getPermissionsByRole(adminUser.role)

    return { success: true, token, user, permissions }
  }

  @Post('mfa/login-verify')
  async mfaLoginVerify(@Body() dto: MfaLoginVerifyDto) {
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

    const valid = await this.mfaService.verifyLoginMfa(payload.adminId, code)
    if (!valid) {
      return { success: false, message: '验证码错误' }
    }

    const adminUser = await this.adminAccountService.findById(payload.adminId)
    if (!adminUser) {
      return { success: false, message: '账号不存在' }
    }

    const token = this.jwtService.sign(
      { sub: adminUser.id, username: adminUser.username, role: adminUser.role, type: 'admin' },
      {
        secret: adminJwtConfig.secret,
        expiresIn: adminJwtConfig.expiresIn,
      },
    )

    const user = {
      id: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname || adminUser.username,
      role: adminUser.role,
      avatar: adminUser.avatar || '',
      mfaEnabled: adminUser.isMfaEnabled || false,
      mfaType: 'none',
    }

    const permissions = this.getPermissionsByRole(adminUser.role)

    return { success: true, token, user, permissions }
  }

  // ===== 子账号管理接口（仅超级管理员） =====

  @Get('admin-users')
  @Roles('super_admin')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async list() {
    const list = await this.adminAccountService.list()
    return { success: true, data: { list } }
  }

  @Post('admin-users')
  @Roles('super_admin')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async create(@Body() dto: CreateAdminUserDto) {
    await this.adminAccountService.create(dto)
    return { success: true, message: '创建成功' }
  }

  @Put('admin-users/:id')
  @Roles('super_admin')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    await this.adminAccountService.update(id, dto)
    return { success: true, message: '更新成功' }
  }

  @Delete('admin-users/:id')
  @Roles('super_admin')
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.adminAccountService.delete(id)
    return { success: true, message: '删除成功' }
  }

  private getPermissionsByRole(role: AdminRole): string[] {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return ['*']
      case AdminRole.MATCHMAKER:
        return ['user:list', 'user:edit', 'matchmaker:list', 'matchmaker:edit', 'dashboard']
      case AdminRole.OPERATOR:
        return ['user:list', 'audit:list', 'audit:edit', 'question:list', 'question:edit', 'payment:list', 'dashboard']
      case AdminRole.READONLY:
        return ['user:list', 'audit:list', 'question:list', 'payment:list', 'dashboard']
      default:
        return []
    }
  }
}
