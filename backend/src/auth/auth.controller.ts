import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuthService } from './auth.service'
import { WechatLoginDto, PhoneLoginDto, RefreshTokenDto, UpdateProfileDto } from './dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Result } from '../common/result'
import { Feedback } from '../entities/Feedback'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
  ) {}

  @Post('wechat-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async wechatLogin(@Body() dto: WechatLoginDto, @Request() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || ''
    const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : ''
    const userAgent = (dto.deviceInfo || req.headers['user-agent'] || '') as string
    const result = await this.authService.wechatLogin(dto.code, ipAddress, userAgent)
    return Result.success(result)
  }

  @Post('phone-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async phoneLogin(@Body() dto: PhoneLoginDto, @Request() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || ''
    const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : ''
    const userAgent = (dto.deviceInfo || req.headers['user-agent'] || '') as string
    const result = await this.authService.phoneLogin(
      dto.sessionKey,
      dto.encryptedData,
      dto.iv,
      ipAddress,
      userAgent,
    )
    return Result.success(result)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto.refreshToken)
    return Result.success(tokens)
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.authService.getProfile(req.user.id)
    return Result.success(user)
  }

  /** 查询到店认证状态（使用原生 SQL 避免 TypeORM 实体列映射问题） */
  @Get('store-cert-status')
  @UseGuards(JwtAuthGuard)
  async getStoreCertStatus(@Request() req) {
    const certified = await this.authService.getStoreCertStatus(req.user.id)
    return Result.success({ certified })
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.id, dto)
    return Result.success(user)
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Request() req,
    @Body() body: { content: string; images?: string[] },
  ) {
    if (!body.content || !body.content.trim()) {
      return Result.badRequest('请填写您的举报理由')
    }
    if (body.content.length > 200) {
      return Result.badRequest('反馈内容不能超过200字')
    }
    const feedback = this.feedbackRepo.create({
      userId: req.user.id,
      content: body.content.trim(),
      images: body.images || [],
    })
    await this.feedbackRepo.save(feedback)
    return Result.success(null, '提交成功')
  }
}
