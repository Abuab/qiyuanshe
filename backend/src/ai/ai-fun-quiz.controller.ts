import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiFunQuizService } from './ai-fun-quiz.service'
import { FunQuizRequest, FunQuizAnswerRequest } from './ai-fun-quiz.types'
import { Result } from '../common/result'

/**
 * 小程序端：AI 趣味缘分测试接口
 */
@Controller('ai/fun-quiz')
export class AiFunQuizController {
  constructor(private readonly funQuizService: AiFunQuizService) {}

  /**
   * AI 趣味情感问答 —— 获取一道题目
   * POST /ai/fun-quiz
   */
  @Post()
  async askQuestion() {
    const data = await this.funQuizService.generateQuestion()
    return Result.success(data)
  }

  /**
   * AI 趣味情感问答 —— 提交回答
   * POST /ai/fun-quiz/answer
   */
  @Post('answer')
  async answerQuestion(@Body() body: FunQuizAnswerRequest) {
    const data = await this.funQuizService.respondToAnswer(body.answer)
    return Result.success(data)
  }

  /**
   * 生成缘分密码报告
   * POST /ai/fun-quiz/generate
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Req() req: any, @Body() body: FunQuizRequest) {
    const data = await this.funQuizService.generateReport(req.user.id, body)
    return Result.success(data, data.fromCache ? '（缓存结果）' : '生成成功')
  }

  /**
   * 查询今日剩余配额
   * GET /ai/fun-quiz/quota
   */
  @Get('quota')
  @UseGuards(JwtAuthGuard)
  async getQuota(@Req() req: any) {
    const data = await this.funQuizService.getQuota(req.user.id)
    return Result.success(data)
  }
}
