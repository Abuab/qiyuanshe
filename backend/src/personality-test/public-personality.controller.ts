import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards'
import { Result } from '../common/result'
import { PersonalityUserService } from './personality-user.service'
import { PersonalityGuestService } from './personality-guest.service'

/**
 * 小程序端：人格测试接口
 *
 * 登录用户通过 JWT 识别；游客通过 guestToken 识别。
 * 统一返回 Result 标准响应格式。
 */
@Controller('personality')
export class PublicPersonalityController {
  constructor(
    private readonly userService: PersonalityUserService,
    private readonly guestService: PersonalityGuestService,
  ) {}

  /**
   * 创建游客 token（进入测试前调用）
   * POST /personality/guest-token  Body: { deviceInfo }
   */
  @Post('guest-token')
  @UseGuards(ThrottlerGuard)
  async createGuestToken(@Body() body: any, @Request() req: any) {
    const ip = ((req.headers['x-forwarded-for'] as string) || req.ip || '').toString()
    const data = await this.guestService.createGuestToken(body?.deviceInfo, ip)
    return Result.success(data)
  }

  /**
   * 获取题目列表（随机抽取 + 打乱）
   * GET /personality/questions?guestToken=xxx
   */
  @Get('questions')
  @UseGuards(OptionalJwtAuthGuard)
  async getQuestions(@Query('guestToken') guestToken: string, @Request() req: any) {
    const data = await this.userService.getQuestions({
      userId: req.user?.id,
      guestToken,
    })
    return Result.success(data)
  }

  /**
   * 提交作答并计算结果
   * POST /personality/submit  Body: { sessionId, guestToken?, answers:[{questionId,optionId,answeredAt?}], startedAt? }
   */
  @Post('submit')
  @UseGuards(OptionalJwtAuthGuard)
  async submit(@Body() body: any, @Request() req: any) {
    const data = await this.userService.submit(
      {
        sessionId: body?.sessionId,
        guestToken: body?.guestToken,
        answers: body?.answers || [],
        startedAt: body?.startedAt,
      },
      { userId: req.user?.id, guestToken: body?.guestToken },
    )
    return Result.success(data, '测试完成')
  }

  /**
   * 获取我的结果（登录用户或游客）
   * GET /personality/my-result?guestToken=xxx
   */
  @Get('my-result')
  @UseGuards(OptionalJwtAuthGuard)
  async myResult(@Query('guestToken') guestToken: string, @Request() req: any) {
    const data = await this.userService.getMyResult({
      userId: req.user?.id,
      guestToken,
    })
    return Result.success(data)
  }

  /**
   * 重新测试（清空/校验后返回新题目）
   * POST /personality/retest  Body: { guestToken? }
   */
  @Post('retest')
  @UseGuards(OptionalJwtAuthGuard)
  async retest(@Body() body: any, @Request() req: any) {
    const data = await this.userService.retest({
      userId: req.user?.id,
      guestToken: body?.guestToken,
    })
    return Result.success(data)
  }

  /**
   * 游客结果迁移到登录用户（需登录）
   * POST /personality/migrate  Body: { guestToken }
   */
  @Post('migrate')
  @UseGuards(JwtAuthGuard)
  async migrate(@Body() body: any, @Request() req: any) {
    const data = await this.userService.migrateGuestResult(req.user.id, body?.guestToken)
    return Result.success(data, '结果已迁移')
  }

  /**
   * 查看他人人格结果（资料卡，简化版）
   * GET /personality/result/user/:userId
   */
  @Get('result/user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async othersResult(@Param('userId') userId: string) {
    const data = await this.userService.getOthersResult(parseInt(userId, 10))
    return Result.success(data)
  }
}
