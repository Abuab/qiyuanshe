import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Result } from '../common/result'
import { EidAuthService } from './eid-auth.service'

@Controller('eid-auth')
export class EidAuthController {
  constructor(private readonly service: EidAuthService) {}

  /** 实名认证前检查身份证号是否已被绑定 */
  @Post('check-duplicate')
  @UseGuards(JwtAuthGuard)
  async checkDuplicate(@Request() req: any, @Body() body: { idCard?: string; realName?: string }) {
    const userId = req.user.id || req.user.sub
    if (!body?.idCard) {
      return Result.error('请提供身份证号')
    }
    try {
      const data = await this.service.checkIdCardDuplicate(userId, body.idCard, body.realName)
      return Result.success(data)
    } catch (e: any) {
      return Result.error(e?.message || '检查失败')
    }
  }

  /** 二次认证：已注销用户支付 1 元后复用历史身份信息完成认证 */
  @Put('re-verify')
  @UseGuards(JwtAuthGuard)
  async reVerify(@Request() req: any, @Body() body: { idCard?: string }) {
    const userId = req.user.id || req.user.sub
    if (!body?.idCard) {
      return Result.error('请提供身份证号')
    }
    try {
      const data = await this.service.reVerifyAccount(userId, body.idCard)
      if (data.success) {
        return Result.success(null, data.message)
      }
      return Result.error(data.message)
    } catch (e: any) {
      return Result.error(e?.message || '二次认证失败')
    }
  }

  /** 创建认证订单：返回 E证通 EidToken 供小程序 SDK 调起 */
  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Request() req: any) {
    const userId = req.user.id || req.user.sub
    try {
      const data = await this.service.createOrder(userId)
      return Result.success(data)
    } catch (e: any) {
      return Result.error(e?.message || '创建认证订单失败')
    }
  }

  /** 查询当前用户认证结果（仅返回状态，不返回身份信息） */
  @Get('result')
  @UseGuards(JwtAuthGuard)
  async result(
    @Request() req: any,
    @Query('realName') realName?: string,
    @Query('idCard') idCard?: string,
  ) {
    const userId = req.user.id || req.user.sub
    try {
      const data = await this.service.queryResult(userId, { realName, idCard })
      return Result.success(data)
    } catch (e: any) {
      return Result.error(e?.message || '查询认证结果失败')
    }
  }

  /** 身份证 OCR 识别（仅返回识别结果供前端填充，不保存） */
  @Post('ocr')
  @UseGuards(JwtAuthGuard)
  async ocr(@Body() body: { imageBase64?: string }) {
    try {
      const data = await this.service.recognizeIdCard(body?.imageBase64 || '')
      return Result.success(data)
    } catch (e: any) {
      return Result.error(e?.message || '身份证识别失败')
    }
  }

  /** E证通异步回调（公开接口，内部做验签） */
  @Post('callback')
  async callback(@Body() body: { eidToken?: string; sign?: string }) {
    const data = await this.service.handleCallback(body || {})
    return Result.success(data)
  }
}
