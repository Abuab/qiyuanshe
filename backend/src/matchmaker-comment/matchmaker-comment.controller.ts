import {
  Controller,
  Get,
  Post,
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
import { MatchmakerCommentService } from './matchmaker-comment.service'
import { Result } from '../common/result'

@Controller('matchmaker-comments')
export class MatchmakerCommentController {
  constructor(private readonly commentService: MatchmakerCommentService) {}

  // 获取某会员的所有红娘评语
  @Get('user/:userId')
  async getByUser(@Param('userId', ParseIntPipe) userId: number) {
    const list = await this.commentService.getByUser(userId)
    return Result.success(list)
  }

  // 获取所有评语列表（小程序首页入口用）
  @Get()
  async getList() {
    const list = await this.commentService.getList()
    return Result.success(list)
  }

  // 红娘给会员写评语（需红娘角色）
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: any,
    @Body() body: { userId: number; content: string; rating: number },
  ) {
    const comment = await this.commentService.create({
      matchmakerId: req.user.userId,
      userId: body.userId,
      content: body.content,
      rating: body.rating || 5,
    })
    return Result.success(comment)
  }

  // 删除评语
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.commentService.remove(id)
    return Result.success(null, '删除成功')
  }
}

@Controller('admin/matchmaker-comments')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
export class AdminMatchmakerCommentController {
  constructor(private readonly commentService: MatchmakerCommentService) {}

  @Get()
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.commentService.getAll(+page, +limit)
    return Result.success(result)
  }

  @Post()
  async create(
    @Body() body: { matchmakerId: number; userId: number; content: string; rating: number },
  ) {
    const comment = await this.commentService.create(body)
    return Result.success(comment)
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.commentService.remove(id)
    return Result.success(null, '删除成功')
  }
}
