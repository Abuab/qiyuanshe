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
import { AuthService } from './auth.service'
import { WechatLoginDto, PhoneLoginDto, RefreshTokenDto, UpdateProfileDto } from './dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Result } from '../common/result'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async wechatLogin(@Body() dto: WechatLoginDto, @Request() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || ''
    const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : ''
    const result = await this.authService.wechatLogin(dto.code, ipAddress)
    return Result.success(result)
  }

  @Post('phone-login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async phoneLogin(@Body() dto: PhoneLoginDto) {
    const result = await this.authService.phoneLogin(
      dto.sessionKey,
      dto.encryptedData,
      dto.iv,
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

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.id, dto)
    return Result.success(user)
  }
}
