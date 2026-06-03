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
} from '@nestjs/common'
import { QuestionService } from './question.service'
import { GetQuestionsDto, CreateAnswerDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionsDto) {
    const result = await this.questionService.getQuestions(
      query.page,
      query.limit,
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
  @UseGuards(JwtAuthGuard)
  async createAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAnswerDto,
    @Request() req: any,
  ) {
    try {
      const answer = await this.questionService.createAnswer(
        id,
        req.user.userId,
        dto.content,
        dto.photos || [],
      )

      return {
        success: true,
        message: '回答提交成功，等待审核',
        data: {
          id: answer.id,
          status: answer.status,
        },
      }
    } catch (error: any) {
      console.error('createAnswer error:', error?.message || error)
      if (error.getStatus) throw error
      return {
        success: false,
        message: '回答提交失败: ' + (error?.message || '请稍后重试'),
      }
    }
  }

  @Post(':id/answers/:answerId/like')
  @UseGuards(JwtAuthGuard)
  async likeAnswer(
    @Param('answerId', ParseIntPipe) answerId: number,
    @Request() req: any,
  ) {
    try {
      const result = await this.questionService.likeAnswer(
        answerId,
        req.user.userId,
      )

      return {
        success: true,
        ...result,
      }
    } catch (error: any) {
      console.error('likeAnswer error:', error?.message || error)
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
  constructor(private readonly questionService: QuestionService) {}

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    try {
      const result = await this.questionService.likeAnswer(
        id,
        req.user.userId,
      )

      return {
        success: true,
        ...result,
      }
    } catch (error: any) {
      console.error('AnswerController like error:', error?.message || error)
      if (error.getStatus) throw error
      return {
        success: false,
        message: '点赞失败: ' + (error?.message || '请稍后重试'),
      }
    }
  }
}
