import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Result } from '../common/result'
import { GuideConfigService } from './guide-config.service'
import { CopyResolveService } from './copy-resolve.service'
import { CopyStatsService } from './copy-stats.service'
import { CopySlotService } from './copy-slot.service'

/**
 * 小程序端：引导文案 + 首页浮动按钮
 */
@Controller('guide')
export class PublicGuideController {
  constructor(
    private readonly configService: GuideConfigService,
    private readonly resolveService: CopyResolveService,
    private readonly statsService: CopyStatsService,
    private readonly slotService: CopySlotService,
  ) {}

  /** 获取首页浮动按钮配置（即时生效） */
  @Get('floating-button')
  async floatingButton() {
    return Result.success(await this.configService.getFloatingButton())
  }

  /** 获取指定文案位当前应展示的文案（按用户身份 + 展示模式策略） */
  @Get('copy/resolve')
  @UseGuards(OptionalJwtAuthGuard)
  async resolve(
    @Query('slotCode') slotCode: string,
    @Query('visitorId') visitorId: string,
    @Request() req: any,
  ) {
    if (!slotCode) return Result.success({ slotCode: '', mode: 'carousel', items: [] })
    const ctx = await this.resolveService.buildContext(req.user?.id, visitorId)
    return Result.success(await this.resolveService.resolve(slotCode, ctx))
  }

  /**
   * 上报文案曝光（去重：同一用户同一天同一文案位只计一次）。
   * 全展示模式一次视图可通过 itemIds 数组上报多条，各计一次曝光。
   */
  @Post('copy/exposure')
  @UseGuards(OptionalJwtAuthGuard)
  async exposure(@Body() body: any, @Request() req: any) {
    const slotId = await this.resolveSlotId(body?.slotCode)
    if (!slotId) return Result.success(false)
    const itemIds = this.parseItemIds(body)
    if (itemIds.length === 0) return Result.success(false)
    const userKey = this.buildUserKey(req.user?.id, body?.visitorId)
    await this.statsService.reportExposure(slotId, itemIds, userKey)
    return Result.success(true)
  }

  /** 上报文案点击 */
  @Post('copy/click')
  @UseGuards(OptionalJwtAuthGuard)
  async click(@Body() body: any) {
    const itemId = parseInt(body?.itemId, 10)
    const slotId = await this.resolveSlotId(body?.slotCode)
    if (!Number.isFinite(itemId) || !slotId) return Result.success(false)
    await this.statsService.reportClick(slotId, itemId)
    return Result.success(true)
  }

  /** 上报引导登录成功（登录后携带此前记录的 itemId 回调，需已登录） */
  @Post('copy/login-conversion')
  @UseGuards(JwtAuthGuard)
  async loginConversion(@Body() body: any) {
    const itemId = parseInt(body?.itemId, 10)
    if (!Number.isFinite(itemId)) return Result.success(false)
    await this.statsService.reportLoginConversion(itemId)
    return Result.success(true)
  }

  private async resolveSlotId(slotCode: any): Promise<number | null> {
    if (typeof slotCode !== 'string' || !slotCode) return null
    const slot = await this.slotService.getByCode(slotCode)
    return slot ? slot.id : null
  }

  /** 解析曝光上报的文案 id 列表：支持 itemIds 数组，兼容单个 itemId */
  private parseItemIds(body: any): number[] {
    const raw = Array.isArray(body?.itemIds)
      ? body.itemIds
      : body?.itemId !== undefined
        ? [body.itemId]
        : []
    return raw.map((v: any) => parseInt(v, 10)).filter((n: number) => Number.isFinite(n))
  }

  private buildUserKey(userId?: number, visitorId?: string): string | null {
    if (userId) return `u:${userId}`
    if (typeof visitorId === 'string' && visitorId.trim()) return `v:${visitorId.trim()}`
    return null
  }
}
