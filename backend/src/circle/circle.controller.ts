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
import { OptionalJwtAuthGuard } from '../auth/guards'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { CircleService } from './circle.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

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

  @Get(':id/users')
  @UseGuards(OptionalJwtAuthGuard)
  async getCircleUsers(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.circleService.getCircleUsers(id, +page, +limit, req?.user?.id)
    return Result.success(result)
  }
}

@Controller('admin/circles')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
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
}
