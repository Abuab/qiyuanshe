import { Controller, Get, Post, Param, Req, UseGuards, ParseIntPipe, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiChatSkillService } from './ai-chat-skill.service'
import { Result } from '../common/result'

/**
 * 小程序端：AI 聊天话术助手接口
 */
@Controller('ai/chat-skill')
@UseGuards(JwtAuthGuard)
export class AiChatSkillController {
  constructor(private readonly chatSkillService: AiChatSkillService) {}

  /**
   * 生成话术建议（针对某个聊天对象）
   * POST /ai/chat-skill/generate/:targetUserId
   */
  @Post('generate/:targetUserId')
  async generate(
    @Req() req: any,
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    const data = await this.chatSkillService.generateSuggestions(req.user.id, targetUserId)
    return Result.success(data)
  }

  /**
   * 查询今日剩余配额
   * GET /ai/chat-skill/quota
   */
  @Get('quota')
  async getQuota(@Req() req: any) {
    const data = await this.chatSkillService.getQuota(req.user.id)
    return Result.success(data)
  }
}
