import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { AdminUser } from '../entities/AdminUser'
import { Result } from '../common/result'

@Controller('admin')
export class ForgotPasswordController {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {}

  private getResetKey(): string {
    const key = process.env.ADMIN_RESET_KEY
    if (key) return key
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_RESET_KEY environment variable is required in production')
    }
    // 开发环境：生成临时密钥（仅当次有效），需从控制台日志获取
    const tempKey = crypto.randomBytes(16).toString('hex')
    console.warn(`[SECURITY] ADMIN_RESET_KEY not set. Temporary reset key (DO NOT use in production): ${tempKey}`)
    return tempKey
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 每5分钟最多3次
  async resetPassword(
    @Body() dto: { username: string; newPassword: string; adminKey: string },
  ) {
    const resetKey = this.getResetKey()
    if (!dto.adminKey || dto.adminKey !== resetKey) {
      throw new UnauthorizedException('重置密钥错误')
    }

    const admin = await this.adminRepo.findOne({ where: { username: dto.username } })

    if (!admin) {
      throw new NotFoundException('管理员账号不存在')
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10)
    await this.adminRepo.update(admin.id, { password: hashedPassword })

    return Result.success(null, '密码已重置')
  }
}
