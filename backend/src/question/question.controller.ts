import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Req,
  Logger,
} from '@nestjs/common'
import { QuestionService } from './question.service'
import { GetQuestionsDto, CreateAnswerDto } from './dto'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards'
import { RequireLicense } from '../license/license.decorator'

@Controller('questions')
export class QuestionController {
  private readonly logger = new Logger(QuestionController.name)

  constructor(private readonly questionService: QuestionService) {}

  @Get('hot')
  async getHotQuestions() {
    const list = await this.questionService.getHotQuestionsForHome()
    return { success: true, list }
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getQuestions(@Query() query: GetQuestionsDto, @Req() req: any) {
    const userId = req.user?.id || null
    const result = await this.questionService.getQuestions(
      query.page,
      query.limit,
      userId,
    )

    return {
      success: true,
      list: result.list,
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  }

  @Get(':id')
  async getQuestionDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.questionService.getQuestionDetail(
      id,
      page || 1,
      limit || 20,
    )

    return {
      success: true,
      ...result,
    }
  }

  @Post(':id/answers')
  @RequireLicense()
  @UseGuards(JwtAuthGuard)
  async createAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAnswerDto,
    @Request() req: any,
  ) {
    try {
      const answer = await this.questionService.createAnswer(
        id,
        req.user.id,
        dto.content,
        dto.photos || [],
      )

      return {
        success: true,
        message: answer.status === 0 ? '回答正在审核中，通过后将展示' : '回答提交成功',
        data: {
          id: answer.id,
          status: answer.status,
        },
      }
    } catch (error: any) {
      this.logger.error('createAnswer error:', error?.message || error)
      if (error.getStatus) throw error
      return {
        success: false,
        message: '回答提交失败: ' + (error?.message || '请稍后重试'),
      }
    }
  }

  @Post(':id/answers/:answerId/like')
  @RequireLicense()
  @UseGuards(JwtAuthGuard)
  async likeAnswer(
    @Param('answerId', ParseIntPipe) answerId: number,
    @Request() req: any,
  ) {
    try {
      const result = await this.questionService.likeAnswer(
        answerId,
        req.user.id,
      )

      return {
        success: true,
        ...result,
      }
    } catch (error: any) {
      this.logger.error('likeAnswer error:', error?.message || error)
      if (error.getStatus) throw error
      return {
        success: false,
        message: '点赞失败: ' + (error?.message || '请稍后重试'),
      }
    }
  }
}

@Controller('answers')
export class AnswerController {
  private readonly logger = new Logger(AnswerController.name)

  constructor(private readonly questionService: QuestionService) {}

  @Post(':id/like')
  @RequireLicense()
  @UseGuards(JwtAuthGuard)
  async likeAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    try {
      const result = await this.questionService.likeAnswer(
        id,
        req.user.id,
      )

      return {
        success: true,
        ...result,
      }
    } catch (error: any) {
      this.logger.error('AnswerController like error:', error?.message || error)
      if (error.getStatus) throw error
      return {
        success: false,
        message: '点赞失败: ' + (error?.message || '请稍后重试'),
      }
    }
  }
}
