import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { MfaService } from './mfa.service'
import { Result } from '../common/result'

@Controller('admin/mfa')
@UseGuards(AdminJwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  async setup(@Request() req: any) {
    const adminId = req.user.id
    const data = await this.mfaService.setupTotp(adminId)
    return Result.success(data)
  }

  @Post('verify-totp')
  async verifyTotp(@Request() req: any, @Body('code') code: string) {
    const adminId = req.user.id
    await this.mfaService.enableTotp(adminId, code)
    return Result.success(null, 'TOTP 绑定成功')
  }

  @Post('disable')
  async disable(@Request() req: any, @Body('code') code: string) {
    const adminId = req.user.id
    await this.mfaService.disableMfa(adminId, code)
    return Result.success(null, '双因素认证已禁用')
  }
}
