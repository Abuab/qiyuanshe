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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { CircleService } from './circle.service'
import { Result } from '../common/result'

@Controller('circles')
export class CircleController {
  constructor(private readonly circleService: CircleService) {}

  @Get()
  async getCircles() {
    const list = await this.circleService.getCircles()
    return Result.success(list)
  }

  @Get(':id')
  async getCircleDetail(@Param('id', ParseIntPipe) id: number) {
    const circle = await this.circleService.getCircleDetail(id)
    return Result.success(circle)
  }

  @Get(':id/posts')
  async getPosts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.circleService.getPosts(id, +page, +limit)
    return Result.success(result)
  }

  @Get(':id/users')
  async getCircleUsers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.circleService.getCircleUsers(id, +page, +limit)
    return Result.success(result)
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(
    @Request() req: any,
    @Body() body: { circleId: number; content: string; images: string[] },
  ) {
    const post = await this.circleService.createPost({
      circleId: body.circleId,
      userId: req.user.userId,
      content: body.content,
      images: body.images || [],
    })
    return Result.success(post)
  }

  @Get('post/:postId')
  async getPostDetail(@Param('postId', ParseIntPipe) postId: number) {
    const post = await this.circleService.getPostDetail(postId)
    return Result.success(post)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('post/:postId')
  async deletePost(@Param('postId', ParseIntPipe) postId: number) {
    await this.circleService.deletePost(postId)
    return Result.success({ postId }, '删除成功')
  }
}

@Controller('admin/circles')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
export class AdminCircleController {
  constructor(private readonly circleService: CircleService) {}

  @Get()
  async getCircles() {
    const list = await this.circleService.getCirclesAll()
    return Result.success(list)
  }

  @Post()
  async createCircle(@Body() body: { name: string; icon: string; bannerImage?: string; description: string; sort: number }) {
    const circle = await this.circleService.createCircle(body)
    return Result.success(circle)
  }

  @Put(':id')
  async updateCircle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; icon?: string; bannerImage?: string; description?: string; sort?: number; status?: number },
  ) {
    const circle = await this.circleService.updateCircle(id, body)
    return Result.success(circle)
  }

  @Delete(':id')
  async deleteCircle(@Param('id', ParseIntPipe) id: number) {
    await this.circleService.deleteCircle(id)
    return Result.success({ id }, '删除成功')
  }

  // ========== 圈子成员管理 ==========

  @Get(':id/members')
  async getMembers(@Param('id', ParseIntPipe) id: number) {
    const members = await this.circleService.getCircleMembers(id)
    return Result.success(members)
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number },
  ) {
    await this.circleService.addCircleMember(id, body.userId)
    return Result.success(null, '添加成功')
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.circleService.removeCircleMember(id, userId)
    return Result.success(null, '移除成功')
  }

  @Get('users/search')
  async searchUsers(@Query('keyword') keyword: string) {
    const users = await this.circleService.searchUsers(keyword || '')
    return Result.success(users)
  }

  // 用户全量分页查询（穿梭框左侧数据源）
  @Get('users')
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('keyword') keyword?: string,
  ) {
    const result = await this.circleService.getAllUsers(+page, +limit, keyword)
    return Result.success(result)
  }

  // 批量保存圈子成员（含排序）
  @Put(':id/members')
  async saveMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { members: { userId: number; sortOrder: number }[] },
  ) {
    await this.circleService.saveCircleMembersBatch(id, body.members || [])
    return Result.success(null, '保存成功')
  }

  @Get('posts')
  async getPosts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status: number,
  ) {
    const result = await this.circleService.getPostsAll(+page, +limit, status ? +status : undefined)
    return Result.success(result)
  }

  @Put('posts/:id/audit')
  async auditPost(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    await this.circleService.auditPost(id, status)
    return Result.success(null, '操作成功')
  }

  @Delete('posts/:id')
  @Roles('super_admin', 'admin')
  async deletePost(@Param('id', ParseIntPipe) id: number) {
    await this.circleService.deletePost(id)
    return Result.success({ id }, '删除成功')
  }
}
