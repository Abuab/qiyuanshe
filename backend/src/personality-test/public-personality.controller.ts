import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common'
import type { Response as ExpressResponse } from 'express'
import * as QRCode from 'qrcode'
import { ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards'
import { Result } from '../common/result'
import { PersonalityUserService } from './personality-user.service'
import { PersonalityGuestService } from './personality-guest.service'
import { PersonalityMatchService } from './personality-match.service'
import { WechatQrService } from './wechat-qr.service'

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
    private readonly matchService: PersonalityMatchService,
    private readonly wechatQrService: WechatQrService,
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
   * 暂存答题进度（断点续答，游客/用户均存 Redis）
   * POST /personality/progress  Body: { guestToken?, sessionId?, answers }
   */
  @Post('progress')
  @UseGuards(OptionalJwtAuthGuard)
  async saveProgress(@Body() body: any, @Request() req: any) {
    await this.userService.saveProgress(
      { userId: req.user?.id, guestToken: body?.guestToken },
      { sessionId: body?.sessionId, answers: body?.answers || [] },
    )
    return Result.success(true)
  }

  /**
   * 读取暂存的答题进度
   * GET /personality/progress?guestToken=xxx
   */
  @Get('progress')
  @UseGuards(OptionalJwtAuthGuard)
  async getProgress(@Query('guestToken') guestToken: string, @Request() req: any) {
    const data = await this.userService.getProgress({
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

  /**
   * 推荐卡片人格匹配度标识
   * GET /personality/match-map?userIds=1,2,3
   * 返回 { tested: boolean, map: { [userId]: percent } }
   * - tested=false 表示当前用户未测试，前端展示「测一测更精准」
   * - 仅作视觉标签，不参与推荐排序
   */
  @Get('match-map')
  @UseGuards(OptionalJwtAuthGuard)
  async matchMap(@Query('userIds') userIds: string, @Request() req: any) {
    const currentUserId = req.user?.id || 0
    if (!currentUserId) {
      return Result.success({ tested: false, map: {} })
    }
    const ids = (userIds || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
    const percentMap = await this.matchService.getMatchPercentMap(currentUserId, ids)
    const map: Record<number, number> = {}
    percentMap.forEach((v, k) => {
      map[k] = v
    })
    // percentMap 为空可能是当前用户未测试，也可能是候选无结果；用 hasResult 精确判断
    const tested = await this.userService.hasResult(currentUserId)
    return Result.success({ tested, map })
  }

  /**
   * 生成分享二维码（PNG）供海报绘制
   * GET /personality/share-qr?userId=xxx
   *
   * 优先生成微信小程序码（扫码直达小程序），失败时回退为普通链接二维码，保证海报始终有码。
   */
  @Get('share-qr')
  @UseGuards(OptionalJwtAuthGuard)
  async shareQr(
    @Query('userId') userId: string,
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    const uid = req.user?.id || (userId ? parseInt(userId, 10) : 0) || 0
    let buffer: Buffer | null = null
    // 1) 优先：微信小程序码（scene 携带邀请人 id，用于追踪）
    try {
      buffer = await this.wechatQrService.getMiniProgramCode(`i=${uid}`)
    } catch {
      buffer = null
    }
    // 2) 回退：普通链接二维码
    if (!buffer) {
      const base = process.env.APP_SHARE_BASE_URL || 'https://qiyuanshe.example.com'
      const url = `${base}/#/pages/personality/result?inviter=${uid}&from=poster`
      try {
        buffer = await QRCode.toBuffer(url, {
          width: 280,
          margin: 1,
          color: { dark: '#FF6B9D', light: '#FFFFFF' },
        })
      } catch {
        res.status(500).end()
        return
      }
    }
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(buffer)
  }

  /**
   * 生成用户主页分享二维码（PNG）供「介绍给好友」海报绘制
   * GET /personality/user-share-qr?userId=xxx
   *
   * 优先生成微信小程序码（扫码直达该用户详情页，scene 携带用户 id），
   * 失败时回退为普通链接二维码，保证海报始终有码。
   */
  @Get('user-share-qr')
  @UseGuards(OptionalJwtAuthGuard)
  async userShareQr(
    @Query('userId') userId: string,
    @Response() res: ExpressResponse,
  ) {
    const uid = userId ? parseInt(userId, 10) : 0
    let buffer: Buffer | null = null
    // 1) 优先：微信小程序码，扫码直达 pages/user-detail/index，scene 携带用户 id
    if (uid) {
      try {
        buffer = await this.wechatQrService.getMiniProgramCode(`id=${uid}`, 'pages/user-detail/index')
      } catch {
        buffer = null
      }
    }
    // 2) 回退：普通链接二维码
    if (!buffer) {
      const base = process.env.APP_SHARE_BASE_URL || 'https://qiyuanshe.example.com'
      const url = `${base}/#/pages/user-detail/index?id=${uid}`
      try {
        buffer = await QRCode.toBuffer(url, { width: 280, margin: 1 })
      } catch {
        res.status(500).end()
        return
      }
    }
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(buffer)
  }
}
