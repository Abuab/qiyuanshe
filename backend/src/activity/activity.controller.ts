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
import { ActivityService } from './activity.service'
import { CreateActivityDto, UpdateActivityDto } from './dto'
import { Result } from '../common/result'

@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // 小程序端 - 活动列表
  @Get()
  async list(
    @Query('type') type: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.activityService.getActivityList(type, +page, +limit)
    return Result.success(result)
  }

  // 小程序端 - 活动详情
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.activityService.getActivityDetail(id)
    return Result.success(result)
  }

  // 小程序端 - 报名
  @Post(':id/signup')
  @UseGuards(JwtAuthGuard)
  async signup(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() data: { realName?: string; phone?: string; remark?: string },
  ) {
    try {
      const userId = req.user.userId
      const result = await this.activityService.signup(id, userId, data)
      return Result.success(result, '报名成功')
    } catch (error: any) {
      console.error('signup error:', error?.message || error)
      // 如果是已知的 NestJS HTTP 异常，直接抛出
      if (error.getStatus) throw error
      return Result.serverError('报名失败: ' + (error?.message || '请稍后重试'))
    }
  }

  // 小程序端 - 获取已报名用户头像列表
  @Get(':id/signups')
  async getSignupAvatars(@Param('id', ParseIntPipe) id: number) {
    const result = await this.activityService.getSignupAvatars(id)
    return Result.success(result)
  }
}

@Controller('admin/activities')
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // 后台 - 活动列表
  @Get()
  async list(
    @Query('keyword') keyword?: string,
    @Query('activityType') activityType?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Request() req?: any,
  ) {
    const result = await this.activityService.getAdminList({
      keyword,
      activityType,
      status: status !== undefined ? +status : undefined,
      page: +page,
      limit: +limit,
    }, req?.user)
    return Result.success(result)
  }

  // 后台 - 活动详情
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const result = await this.activityService.getAdminDetail(id)
    return Result.success(result)
  }

  // 后台 - 创建活动
  @Post()
  async create(@Body() data: CreateActivityDto, @Request() req: any) {
    const result = await this.activityService.create(data, req.user?.id)
    return Result.success(result, '创建成功')
  }

  // 后台 - 更新活动
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateActivityDto,
  ) {
    const result = await this.activityService.update(id, data)
    return Result.success(result, '更新成功')
  }

  // 后台 - 更新活动状态
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    const result = await this.activityService.updateStatus(id, status)
    return Result.success(result, '状态更新成功')
  }

  // 后台 - 删除活动
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.activityService.delete(id)
    return Result.success(null, '删除成功')
  }

  // 后台 - 报名列表
  @Get(':id/signups')
  async getSignups(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.activityService.getSignupList(id, +page, +limit)
    return Result.success(result)
  }

  // 后台 - 报名统计
  @Get(':id/signups/stats')
  async getSignupStats(@Param('id', ParseIntPipe) id: number) {
    const result = await this.activityService.getSignupStats(id)
    return Result.success(result)
  }
}

@Controller('admin/signups')
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminSignupController {
  constructor(private readonly activityService: ActivityService) {}

  // 后台 - 确认报名
  @Put(':id/confirm')
  async confirm(@Param('id', ParseIntPipe) id: number) {
    await this.activityService.confirmSignup(id)
    return Result.success(null, '确认成功')
  }

  // 后台 - 取消报名
  @Put(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    await this.activityService.cancelSignup(id)
    return Result.success(null, '取消成功')
  }
}
