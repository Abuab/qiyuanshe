import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Result } from '../common/result'
import { AiPersonalityService } from './ai-personality.service'

/**
 * 小程序端：AI 性格解读 / 匹配建议 / 分享文案
 */
@Controller('ai/personality')
@UseGuards(JwtAuthGuard)
export class AiPersonalityController {
  constructor(private readonly service: AiPersonalityService) {}

  /** 获取当前用户的 AI 性格深度解读（缓存 + 降级） */
  @Get('interpretation')
  async interpretation(@Req() req: any, @Query('force') force?: string) {
    const data = await this.service.getInterpretation(req.user.id, force === '1' || force === 'true')
    return Result.success(data)
  }

  /** 是否可展示「AI红娘说」入口（双方均已测试且功能开启） */
  @Get('match-advice/eligibility')
  async eligibility(@Req() req: any, @Query('targetUserId') targetUserId: string) {
    const data = await this.service.getMatchAdviceEligibility(req.user.id, parseInt(targetUserId, 10))
    return Result.success(data)
  }

  /** 获取与目标用户的 AI 红娘匹配建议 */
  @Get('match-advice')
  async matchAdvice(@Req() req: any, @Query('targetUserId') targetUserId: string) {
    const data = await this.service.getMatchAdvice(req.user.id, parseInt(targetUserId, 10))
    return Result.success(data)
  }

  /** 生成 AI 分享文案（style: humor/literary/sincere） */
  @Post('share-copy')
  async shareCopy(@Req() req: any, @Body('style') style: string) {
    const data = await this.service.getShareCopies(req.user.id, style)
    return Result.success(data)
  }
}
