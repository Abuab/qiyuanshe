import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { AdminQuestionService } from './question.service'
import { Result } from '../common/result'

interface QuestionFilter {
  page?: number
  limit?: number
  keyword?: string
  type?: number
  status?: number
}

@Controller('admin/questions')
@UseGuards(AdminJwtAuthGuard)
export class AdminQuestionController {
  constructor(private readonly questionService: AdminQuestionService) {}

  @Get()
  async list(@Query() filter: QuestionFilter) {
    const result = await this.questionService.list(filter)
    return Result.success(result)
  }

  @Get('answers')
  async getAnswers(@Query('questionId', ParseIntPipe) questionId: number) {
    const answers = await this.questionService.getAnswers(questionId)
    return Result.success(answers)
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const question = await this.questionService.detail(id)
    return Result.success(question)
  }

  @Post()
  async create(@Body() data: any) {
    await this.questionService.create(data)
    return Result.success(null, '添加成功')
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    await this.questionService.update(id, data)
    return Result.success(null, '更新成功')
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.questionService.delete(id)
    return Result.success(null, '删除成功')
  }

  @Put(':id/sort')
  async sort(
    @Param('id', ParseIntPipe) id: number,
    @Body('sortOrder') sortOrder: number,
  ) {
    await this.questionService.updateSort(id, sortOrder)
    return Result.success(null, '排序更新成功')
  }

  @Delete('answers/:answerId')
  async deleteAnswer(@Param('answerId', ParseIntPipe) answerId: number) {
    await this.questionService.deleteAnswer(answerId)
    return Result.success(null, '删除成功')
  }
}
