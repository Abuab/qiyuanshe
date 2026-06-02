import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { AdminUser } from '../entities/AdminUser'
import { Result } from '../common/result'

@Controller('admin')
export class ForgotPasswordController {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {}

  @Post('reset-password')
  async resetPassword(
    @Body() dto: { username: string; newPassword: string; adminKey: string },
  ) {
    if (!dto.adminKey || dto.adminKey !== process.env.ADMIN_RESET_KEY) {
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
