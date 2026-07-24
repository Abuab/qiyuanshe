import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
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
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get(':id/reports')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getReports(@Param('id', ParseIntPipe) id: number) {
    const data = await this.profileService.getReports(id)
    return Result.success(data)
  }

  @Get(':id/blocks')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getBlocks(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getBlocks(id, page, limit)
    return Result.success(data)
  }

  @Get(':id/notifications')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
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

  /** 群发系统通知给所有用户（或指定用户） */
  @Post('notifications/broadcast')
  async broadcastNotification(
    @Body() body: { title: string; content: string; targetUserIds?: number[] },
    @Req() req: any,
  ) {
    const senderId = req.user?.id
    const result = await this.profileService.broadcastNotification(
      body.title || '系统通知',
      body.content,
      senderId,
      body.targetUserIds,
    )
    return Result.success(result, `已向 ${result.totalSent} 位用户发送通知`)
  }

  /** 查询群发消息日志 */
  @Get('notifications/broadcast/logs')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getBroadcastLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.profileService.getBroadcastLogs(+page || 1, +limit || 20)
    return Result.success(result)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
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
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getMatchRecords(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.profileService.getMatchRecords(id, page, limit)
    return Result.success(data)
  }

  @Get(':id/matchmaker-reviews')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
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
