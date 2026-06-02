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
  Request,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
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
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminQuestionController {
  constructor(private readonly questionService: AdminQuestionService) {}

  @Get()
  async list(@Query() filter: QuestionFilter, @Request() req: any) {
    const result = await this.questionService.list(filter, req.user)
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
  async create(@Body() data: any, @Request() req: any) {
    await this.questionService.create(data, req.user?.id)
    return Result.success(null, '添加成功')
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    const result = await this.questionService.update(id, data)
    return Result.success(result, '更新成功')
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
