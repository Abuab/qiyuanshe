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
import { AdminRole } from '../shared/enums'

@Controller('admin/user-profiles')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
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

  @Post(':id/answers')
  async createAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { questionId: number; content: string },
  ) {
    const answer = await this.profileService.createAnswer(id, body.questionId, body.content)
    return Result.success(answer, '回答添加成功')
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

  @Put('answers/:answerId/approve')
  async approveAnswer(@Param('answerId', ParseIntPipe) answerId: number) {
    await this.profileService.approveAnswer(answerId)
    return Result.success(null, '回答审核已通过')
  }

  @Put('answers/:answerId/reject')
  async rejectAnswer(
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body('reason') reason?: string,
  ) {
    await this.profileService.rejectAnswer(answerId, reason || '')
    return Result.success(null, '回答已拒绝')
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
