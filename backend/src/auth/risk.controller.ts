import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { CaptchaService } from './captcha.service'
import { RiskService } from './risk.service'
import { Result } from '../common/result'
import { VerifyCaptchaDto } from './dto/verify-captcha.dto'

/**
 * 登录风控与图形验证码接口：
 * - GET  /auth/risk/check      风控预判（是否需图形验证）
 * - GET  /auth/captcha         获取图形验证码图片
 * - POST /auth/captcha/verify  校验图形验证码并签发一次性 captchaToken
 */
@Controller('auth')
export class RiskController {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly riskService: RiskService,
  ) {}

  private getIp(req: any): string {
    const ip = req.headers?.['x-forwarded-for'] || req.ip || ''
    return typeof ip === 'string' ? ip.split(',')[0].trim() : ''
  }

  @Get('risk/check')
  async check(
    @Query('phone') phone: string,
    @Query('deviceFingerprint') deviceFingerprint: string,
    @Request() req: any,
  ) {
    const ip = this.getIp(req)
    const needCaptcha = await this.riskService.checkRisk(
      phone || '',
      ip,
      deviceFingerprint || '',
    )
    return Result.success({ needCaptcha })
  }

  @Get('captcha')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async captcha() {
    const { captchaId, imageBase64 } = await this.captchaService.create()
    return Result.success({ captchaId, imageBase64 })
  }

  @Post('captcha/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async verify(@Body() dto: VerifyCaptchaDto, @Request() req: any) {
    const ip = this.getIp(req)
    const userAgent = (req.headers?.['user-agent'] || '') as string

    const ok = await this.captchaService.verify(dto.captchaId, dto.code)
    if (!ok) {
      return Result.badRequest('图形验证码错误，请重新输入')
    }

    const captchaToken = this.riskService.issueCaptchaToken(dto.phone, ip, userAgent)
    return Result.success({ captchaToken })
  }
}
