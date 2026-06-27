import { Controller, Get, Post, Body, Req, UseGuards, Delete, Param, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiMatchmakerService } from './ai-matchmaker.service'
import { QuickQuestionService } from '../quick-question/quick-question.service'
import { Result } from '../common/result'

/**
 * 小程序端：AI 红娘机器人接口
 */
@Controller('ai/matchmaker')
@UseGuards(JwtAuthGuard)
export class AiMatchmakerController {
  constructor(
    private readonly matchmakerService: AiMatchmakerService,
    private readonly quickQuestionService: QuickQuestionService,
  ) {}

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
   * 获取快捷问题列表（从数据库读取，支持按分类筛选）
   * GET /ai/matchmaker/quick-questions?categoryId=1
   */
  @Get('quick-questions')
  async getQuickQuestions(@Query('categoryId') categoryId?: string) {
    const list = await this.quickQuestionService.getEnabledList(
      categoryId ? parseInt(categoryId, 10) : undefined,
    )
    // 返回格式：{ id, content, categoryId, sort }
    // 如果数据库无数据，返回默认数组
    if (list.length === 0) {
      return Result.success([
        { id: 0, content: '第一次约会去哪', sort: 0 },
        { id: 0, content: '怎么开场', sort: 1 },
        { id: 0, content: '对方冷淡怎么办', sort: 2 },
        { id: 0, content: '约会穿搭建议', sort: 3 },
        { id: 0, content: '怎么判断对方真心', sort: 4 },
        { id: 0, content: '帮我推荐几个女生', sort: 5 },
        { id: 0, content: '有没有合适的男生', sort: 6 },
        { id: 0, content: '帮我找25-30岁的', sort: 7 },
      ])
    }
    return Result.success(list)
  }

  /**
   * 快捷问题点击统计上报
   * POST /ai/matchmaker/quick-questions/:id/click
   */
  @Post('quick-questions/:id/click')
  async clickQuickQuestion(@Param('id') id: string) {
    await this.quickQuestionService.incrementClick(parseInt(id, 10))
    return Result.success(null)
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
