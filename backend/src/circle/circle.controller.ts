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
    return Result.success(null, '删除成功')
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
  async createCircle(@Body() body: { name: string; icon: string; description: string; sort: number }) {
    const circle = await this.circleService.createCircle(body)
    return Result.success(circle)
  }

  @Put(':id')
  async updateCircle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; icon: string; description: string; sort: number; status: number },
  ) {
    const circle = await this.circleService.updateCircle(id, body)
    return Result.success(circle)
  }

  @Delete(':id')
  async deleteCircle(@Param('id', ParseIntPipe) id: number) {
    await this.circleService.deleteCircle(id)
    return Result.success(null, '删除成功')
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
    return Result.success(null, '删除成功')
  }
}
