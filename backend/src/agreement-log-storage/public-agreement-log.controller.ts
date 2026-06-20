import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { AgreementLogStorageService } from './agreement-log-storage.service'
import { Result } from '../common/result'
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard'

/**
 * 小程序端：用户同意协议
 * POST /api/user/agreement
 */
@Controller('api/user')
export class PublicAgreementLogController {
  constructor(private readonly storageService: AgreementLogStorageService) {}

  /**
   * 用户同意/不同意协议
   * Body: { agreementType: 'USER_AGREEMENT'|'PRIVACY_POLICY', version: '1.0', action: 'agree'|'disagree' }
   */
  @Post('agreement')
  @UseGuards(OptionalJwtAuthGuard)
  async recordAgreement(
    @Body() body: {
      agreementType: string
      version?: string
      action: string
    },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id || 0
    const ipAddress =
      ((req.headers['x-forwarded-for'] as string) || req.ip || '').split(',')[0]?.trim() || ''
    const userAgent = (req.headers['user-agent'] as string) || ''

    await this.storageService.saveLog({
      userId,
      agreementType: body.agreementType || 'USER_AGREEMENT',
      version: body.version || '1.0',
      action: body.action || 'agree',
      ipAddress,
      userAgent,
    })

    return Result.success(null, '记录成功')
  }
}
