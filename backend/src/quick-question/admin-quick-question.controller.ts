import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { QuickQuestionService } from './quick-question.service'
import { Result } from '../common/result'

/**
 * 管理后台：快捷问题 & 分类管理
 */
@Controller('admin/quick-questions')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator')
export class AdminQuickQuestionController {
  constructor(private readonly service: QuickQuestionService) {}

  // ==================== 快捷问题 CRUD ====================

  /**
   * 获取快捷问题列表（分页）
   * GET /admin/quick-questions?page=1&limit=20&keyword=&categoryId=&isEnabled=
   */
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isEnabled') isEnabled?: string,
  ) {
    const data = await this.service.getAdminList({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword,
      categoryId: categoryId !== undefined ? parseInt(categoryId, 10) : undefined,
      isEnabled: isEnabled !== undefined ? parseInt(isEnabled, 10) : undefined,
    })
    return Result.success(data)
  }

  /**
   * 获取单条快捷问题
   * GET /admin/quick-questions/:id
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const data = await this.service.getById(parseInt(id, 10))
    return Result.success(data)
  }

  /**
   * 新增快捷问题
   * POST /admin/quick-questions
   * Body: { content, categoryId?, sort?, isEnabled? }
   */
  @Post()
  async create(@Body() body: any) {
    const data = await this.service.create(body)
    return Result.success(data, '新增成功')
  }

  /**
   * 编辑快捷问题
   * PUT /admin/quick-questions/:id
   * Body: { content?, categoryId?, sort?, isEnabled? }
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.service.update(parseInt(id, 10), body)
    return Result.success(data, '更新成功')
  }

  /**
   * 删除快捷问题
   * DELETE /admin/quick-questions/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(parseInt(id, 10))
    return Result.success(null, '删除成功')
  }

  /**
   * 批量删除
   * POST /admin/quick-questions/batch-delete
   * Body: { ids: number[] }
   */
  @Post('batch-delete')
  async batchRemove(@Body() body: any) {
    await this.service.batchRemove(body.ids || [])
    return Result.success(null, '批量删除成功')
  }

  /**
   * 批量启用/禁用
   * POST /admin/quick-questions/batch-status
   * Body: { ids: number[], isEnabled: 0|1 }
   */
  @Post('batch-status')
  async batchSetEnabled(@Body() body: any) {
    await this.service.batchSetEnabled(body.ids || [], body.isEnabled)
    return Result.success(null, '批量操作成功')
  }

  /**
   * 重新排序
   * PUT /admin/quick-questions/:id/reorder
   * Body: { sort: number }
   */
  @Put(':id/reorder')
  async reorder(@Param('id') id: string, @Body() body: any) {
    await this.service.reorder(parseInt(id, 10), body.sort)
    return Result.success(null, '排序成功')
  }

  /**
   * 获取点击统计
   * GET /admin/quick-questions/stats/click?period=today|week|month
   */
  @Get('stats/click')
  async getClickStats(@Query('period') period?: string) {
    const p = (period === 'today' || period === 'month') ? period : 'week'
    const data = await this.service.getClickStats(p as 'today' | 'week' | 'month')
    return Result.success(data)
  }

  // ==================== 分类管理 ====================

  /**
   * 获取分类列表
   * GET /admin/quick-questions/categories
   */
  @Get('categories/list')
  async getCategories() {
    const data = await this.service.getCategoryList()
    return Result.success(data)
  }

  /**
   * 新增分类
   * POST /admin/quick-questions/categories
   * Body: { name, sort? }
   */
  @Post('categories')
  async createCategory(@Body() body: any) {
    const data = await this.service.createCategory(body)
    return Result.success(data, '分类新增成功')
  }

  /**
   * 编辑分类
   * PUT /admin/quick-questions/categories/:id
   * Body: { name?, sort?, isEnabled? }
   */
  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    const data = await this.service.updateCategory(parseInt(id, 10), body)
    return Result.success(data, '分类更新成功')
  }

  /**
   * 删除分类
   * DELETE /admin/quick-questions/categories/:id
   */
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(parseInt(id, 10))
    return Result.success(null, '分类已删除')
  }
}
