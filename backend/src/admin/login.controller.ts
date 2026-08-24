import { Controller, Post, Body, Get, Put, Delete, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { CaptchaService } from './captcha.service'
import { MfaService } from './mfa.service'
import { AdminAccountService } from './admin-account.service'
import { RedisService } from '../common/redis.service'
import { AdminAuditLog } from '../entities/AdminAuditLog'
import { adminJwtConfig, mfaJwtConfig } from '../config/jwt'
import { AdminRole } from '../shared/enums'
import { resolveAvatarUrl } from '../common/image-url'

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
  isMfaEnabled?: boolean
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
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  /** 写入审计日志（fire-and-forget，失败不阻塞主流程） */
  private audit(action: string, module: string, adminId: number, adminUsername: string, detail?: string, req?: any) {
    try {
      const rawUrl = req?.originalUrl || req?.url || ''
      const url = rawUrl.replace(/^\/api(?=\/)/, '').substring(0, 500)
      const log = this.auditRepo.create({
        adminId,
        adminUsername,
        action,
        module,
        method: 'POST',
        detail: detail || null,
        url: url || null,
        ip: this.getClientIp(req),
      })
      this.auditRepo.save(log).catch(() => {})
    } catch {}
  }

  /** 提取客户端真实 IP（优先 X-Forwarded-For 首个，兼容反向代理） */
  private getClientIp(req?: any): string {
    if (!req) return ''
    const xff = req.headers?.['x-forwarded-for']
    if (xff) {
      const first = String(xff).split(',')[0]?.trim()
      if (first) return first
    }
    const realIp = req.headers?.['x-real-ip']
    if (realIp) return String(realIp)
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || ''
  }

  /** 生成管理员 token 对（accessToken + refreshToken） */
  private generateTokens(adminUser: { id: number; username: string; role: string; tokenVersion: number }) {
    const payload = {
      sub: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      tokenVersion: adminUser.tokenVersion,
    }

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'admin_access' },
      { secret: adminJwtConfig.secret, expiresIn: adminJwtConfig.expiresIn },
    )

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'admin_refresh' },
      { secret: adminJwtConfig.secret, expiresIn: adminJwtConfig.refreshTokenExpiresIn },
    )

    return { accessToken, refreshToken }
  }

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
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const { username, password, captcha, captchaKey } = dto

    if (!captcha) {
      return { success: false, message: '请输入验证码' }
    }

    if (!captchaKey) {
      return { success: false, message: '验证码已过期，请刷新' }
    }

    const attemptRecord = await this.getLoginAttempt(username)
    if (attemptRecord.blockUntil > Date.now()) {
      this.audit('登录', 'auth', 0, username, '登录被拒绝: 账号已锁定', req)
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
        this.audit('登录', 'auth', 0, username, `登录失败锁定: 已尝试${MAX_LOGIN_ATTEMPTS}次以上，锁定15分钟`, req)
      }
      await this.setLoginAttempt(username, attemptRecord)
      this.audit('登录', 'auth', 0, username, '登录失败: 用户名或密码错误', req)
      return { success: false, message: '用户名或密码错误' }
    }

    await this.clearLoginAttempt(username)

    if (adminUser.isMfaEnabled) {
      const tempToken = this.jwtService.sign(
        { adminId: adminUser.id, type: 'mfa_temp' },
        {
          secret: mfaJwtConfig.secret,
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

    const tokens = this.generateTokens(adminUser)

    const user = {
      id: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname || adminUser.username,
      role: adminUser.role,
      avatar: resolveAvatarUrl(adminUser.avatar) || '',
      mfaEnabled: adminUser.isMfaEnabled || false,
      mfaType: 'none',
    }

    const permissions = this.getPermissionsByRole(adminUser.role)

    this.audit('登录', 'auth', adminUser.id, adminUser.username, '登录成功', req)

    return { success: true, token: tokens.accessToken, refreshToken: tokens.refreshToken, user, permissions }
  }

  @Post('mfa/login-verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async mfaLoginVerify(@Body() dto: MfaLoginVerifyDto, @Req() req: any) {
    const { tempToken, code } = dto

    let payload: any
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: mfaJwtConfig.secret,
      })
    } catch {
      return { success: false, message: '临时令牌已过期，请重新登录' }
    }

    if (payload.type !== 'mfa_temp') {
      return { success: false, message: '无效的令牌类型' }
    }

    const valid = await this.mfaService.verifyLoginMfa(payload.adminId, code)
    if (!valid) {
      this.audit('MFA验证', 'auth', payload.adminId, 'unknown', 'MFA验证失败: 验证码错误', req)
      return { success: false, message: '验证码错误' }
    }

    const adminUser = await this.adminAccountService.findById(payload.adminId)
    if (!adminUser) {
      return { success: false, message: '账号不存在' }
    }

    const tokens = this.generateTokens(adminUser)

    const user = {
      id: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname || adminUser.username,
      role: adminUser.role,
      avatar: resolveAvatarUrl(adminUser.avatar) || '',
      mfaEnabled: adminUser.isMfaEnabled || false,
      mfaType: 'none',
    }

    const permissions = this.getPermissionsByRole(adminUser.role)

    this.audit('MFA登录', 'auth', adminUser.id, adminUser.username, 'MFA验证通过，登录成功', req)

    return { success: true, token: tokens.accessToken, refreshToken: tokens.refreshToken, user, permissions }
  }

  // ===== Token 刷新 =====

  @Post('auth/refresh')
  async refreshToken(@Body() dto: { refreshToken: string }, @Req() req: any) {
    const { refreshToken } = dto
    if (!refreshToken) {
      return { success: false, message: '缺少 refreshToken' }
    }

    let payload: any
    try {
      payload = this.jwtService.verify(refreshToken, { secret: adminJwtConfig.secret })
    } catch {
      return { success: false, message: 'refreshToken 无效或已过期' }
    }

    if (payload.type !== 'admin_refresh') {
      return { success: false, message: '无效的令牌类型' }
    }

    const adminUser = await this.adminAccountService.findById(payload.sub)
    if (!adminUser || adminUser.status !== 1) {
      return { success: false, message: '账号不存在或已禁用' }
    }

    // 验证 tokenVersion
    if (payload.tokenVersion !== undefined && adminUser.tokenVersion !== payload.tokenVersion) {
      return { success: false, message: '令牌已失效，请重新登录' }
    }

    const tokens = this.generateTokens(adminUser)
    this.audit('刷新令牌', 'auth', adminUser.id, adminUser.username, 'Token刷新成功', req)
    return { success: true, token: tokens.accessToken, refreshToken: tokens.refreshToken }
  }

  // ===== 子账号管理接口（仅超级管理员） =====

  @Get('admin-users')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async list() {
    const list = await this.adminAccountService.list()
    return { success: true, data: { list } }
  }

  @Post('admin-users')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async create(@Body() dto: CreateAdminUserDto) {
    await this.adminAccountService.create(dto)
    return { success: true, message: '创建成功' }
  }

  @Put('admin-users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    await this.adminAccountService.update(id, dto)
    return { success: true, message: '更新成功' }
  }

  @Delete('admin-users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.adminAccountService.delete(id)
    return { success: true, message: '删除成功' }
  }

  @Post('admin-users/:id/impersonate')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(AdminJwtAuthGuard, RoleGuard)
  async impersonate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const target = await this.adminAccountService.findById(id)
    if (!target) {
      return { success: false, message: '子账号不存在' }
    }
    if (target.status !== 1) {
      return { success: false, message: '该账号已被禁用，无法登录' }
    }

    const operator = req.user
    this.audit(
      '模拟登录',
      'auth',
      operator?.id || 0,
      operator?.username || 'unknown',
      `模拟登录子账号: ${target.username}(${target.nickname || target.username})`,
      req,
    )

    const tokens = this.generateTokens(target)

    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: target.id,
        username: target.username,
        nickname: target.nickname || target.username,
        role: target.role,
        avatar: resolveAvatarUrl(target.avatar) || '',
        mfaEnabled: target.isMfaEnabled || false,
        mfaType: 'none',
      },
    }
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
