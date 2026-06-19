import { Controller, Get, Post, Body, Req, UseGuards, Delete } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiMatchmakerService } from './ai-matchmaker.service'
import { Result } from '../common/result'

/**
 * 小程序端：AI 红娘机器人接口
 */
@Controller('ai/matchmaker')
@UseGuards(JwtAuthGuard)
export class AiMatchmakerController {
  constructor(private readonly matchmakerService: AiMatchmakerService) {}

  /**
   * 发送消息给 AI 红娘
   * POST /ai/matchmaker/chat
   * Body: { message: string }
   */
  @Post('chat')
  async chat(@Req() req: any, @Body('message') message: string) {
    const data = await this.matchmakerService.chat(req.user.id, message)
    return Result.success(data)
  }

  /**
   * 获取对话历史
   * GET /ai/matchmaker/history
   */
  @Get('history')
  async getHistory(@Req() req: any) {
    const data = await this.matchmakerService.getHistory(req.user.id)
    return Result.success(data)
  }

  /**
   * 获取快捷问题列表
   * GET /ai/matchmaker/quick-questions
   */
  @Get('quick-questions')
  async getQuickQuestions() {
    const data = this.matchmakerService.getQuickQuestions()
    return Result.success(data)
  }

  /**
   * 清除对话上下文（重新开始）
   * DELETE /ai/matchmaker/context
   */
  @Delete('context')
  async clearContext(@Req() req: any) {
    await this.matchmakerService.clearContext(req.user.id)
    return Result.success(null, '对话已重置')
  }
}
