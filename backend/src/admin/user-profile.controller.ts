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
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { UserProfileService } from './user-profile.service'
import { Result } from '../common/result'

@Controller('admin/users')
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get(':id/reports')
  async getReports(@Param('id', ParseIntPipe) id: number) {
    const data = await this.profileService.getReports(id)
    return Result.success(data)
  }

  @Get(':id/blocks')
  async getBlocks(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getBlocks(id, page, limit)
    return Result.success(data)
  }

  @Get(':id/notifications')
  async getNotifications(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getNotifications(id, page, limit)
    return Result.success(data)
  }

  @Post(':id/notifications')
  async sendNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; content: string; senderType?: string },
  ) {
    const notification = await this.profileService.sendNotification(
      id,
      body.title || '系统通知',
      body.content,
      body.senderType || 'admin',
    )
    return Result.success(notification, '通知已发送')
  }

  @Get(':id/answers')
  async getAnswers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getAnswers(id, page, limit)
    return Result.success(data)
  }

  @Get(':id/matches')
  async getMatchRecords(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getMatchRecords(id, page, limit)
    return Result.success(data)
  }

  @Get(':id/matchmaker-reviews')
  async getReviews(@Param('id', ParseIntPipe) id: number) {
    const data = await this.profileService.getReviews(id)
    return Result.success(data)
  }

  @Post(':id/matchmaker-reviews')
  async createReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { matchmakerId: number; content?: string; difficulty?: string },
  ) {
    const review = await this.profileService.createReview(id, body)
    return Result.success(review, '评价添加成功')
  }

  @Put('matchmaker-reviews/:reviewId')
  async updateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() body: { content?: string; difficulty?: string },
  ) {
    const review = await this.profileService.updateReview(reviewId, body)
    return Result.success(review, '评价更新成功')
  }

  @Delete('matchmaker-reviews/:reviewId')
  async deleteReview(@Param('reviewId', ParseIntPipe) reviewId: number) {
    await this.profileService.deleteReview(reviewId)
    return Result.success(null, '评价已删除')
  }
}
