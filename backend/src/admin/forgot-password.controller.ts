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
import { User } from '../entities/User'
import { Result } from '../common/result'

@Controller('admin')
export class ForgotPasswordController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('reset-password')
  async resetPassword(
    @Body() dto: { username: string; newPassword: string; adminKey: string },
  ) {
    if (!dto.adminKey || dto.adminKey !== process.env.ADMIN_RESET_KEY) {
      throw new UnauthorizedException('重置密钥错误')
    }

    if (dto.username !== 'admin') {
      throw new NotFoundException('用户不存在')
    }

    const admin = await this.userRepository.findOne({ where: { id: 1 } })

    if (!admin) {
      throw new NotFoundException('管理员账号不存在')
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10)
    await this.userRepository.update(admin.id, { password: hashedPassword })

    return Result.success(null, '密码已重置')
  }
}
