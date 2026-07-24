import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminUserService } from './user.service'
import { AdminPaymentService } from './payment.service'
import { VipService } from '../vip/vip.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

interface UserFilter {
  page?: number
  limit?: number
  keyword?: string
  gender?: number
  status?: number
  eidCertStatus?: number
  isVip?: number
  vipLevel?: number
  startDate?: string
  endDate?: string
  sort?: string
  order?: string
  minAge?: number
  maxAge?: number
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  education?: string
  occupation?: string
  minMatchCount?: number
  maxMatchCount?: number
}

@Controller('admin/users')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminUserController {
  constructor(
    private readonly userService: AdminUserService,
    private readonly paymentService: AdminPaymentService,
    private readonly vipService: VipService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async list(@Query() filter: UserFilter) {
    const result = await this.userService.list(filter)
    return Result.success(result)
  }

  @Get('deactivated')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async listDeactivated(@Query() query: { page?: number; limit?: number; keyword?: string }) {
    const result = await this.userService.listDeactivated(query)
    return Result.success(result)
  }

  @Get('export')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async export(@Query() filter: any) {
    const ids = filter.ids ? filter.ids.split(',').map(Number) : []
    const data = await this.userService.export({ ...filter, ids })
    return Result.success(data)
  }

  @Get('search')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async searchUsers(@Query('keyword') keyword: string) {
    const users = await this.userService.searchUsers(keyword)
    return Result.success(users)
  }

  /** 获取用户财务记录（VIP订单等） */
  @Get(':id/orders')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async userOrders(@Param('id', ParseIntPipe) id: number) {
    const result = await this.paymentService.getUserOrders(id)
    return Result.success(result)
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async detail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.detail(id)
    return Result.success(user)
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    await this.userService.updateStatus(id, status)
    return Result.success(null, '状态更新成功')
  }

  @Put(':id/vip')
  async updateVip(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { level: number; days: number; packageName?: string },
  ) {
    await this.userService.updateVip(id, body.level, body.days, body.packageName)
    return Result.success(null, 'VIP设置成功')
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    await this.userService.resetPassword(id)
    return Result.success(null, '密码重置成功')
  }

  @Post(':id/notify')
  @HttpCode(HttpStatus.OK)
  async sendNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title: string,
    @Body('content') content: string,
  ) {
    await this.userService.sendNotification(id, title, content)
    return Result.success(null, '通知已发送')
  }

  @Get(':id/photos')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getPhotos(@Param('id', ParseIntPipe) id: number) {
    const photos = await this.userService.getPhotos(id)
    return Result.success(photos)
  }

  @Post(':id/photos')
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { photoUrl: string },
  ) {
    const photo = await this.userService.addPhoto(id, body.photoUrl)
    return Result.success(photo, '照片上传成功')
  }

  @Delete('photos/:photoId')
  async deletePhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    await this.userService.deletePhoto(photoId)
    return Result.success(null, '照片已删除')
  }

  @Put('photos/:photoId/main')
  async setMainPhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    await this.userService.setMainPhoto(photoId)
    return Result.success(null, '已设为主图')
  }

  @Put('batch-status')
  async batchUpdateStatus(@Body() body: { ids: number[]; status: number }) {
    await this.userService.batchUpdateStatus(body.ids, body.status)
    return Result.success(null, '批量状态更新成功')
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.softDelete(id)
    return Result.success(null, '用户已删除')
  }

  @Post('batch-delete')
  async batchDelete(@Body() body: { ids: number[] }) {
    await this.userService.batchSoftDelete(body.ids)
    return Result.success(null, '批量删除成功')
  }

  @Put(':id/restore')
  async restoreUser(@Param('id', ParseIntPipe) id: number) {
    await this.userService.restoreUser(id)
    return Result.success(null, '用户已恢复')
  }

  @Delete(':id/permanent')
  async permanentDelete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.permanentDelete(id)
    return Result.success(null, '用户已彻底删除')
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      nickname: string
      phone: string
      password?: string
      gender?: number
      avatar?: string
      birthYear?: number
      education?: string
      incomeRange?: string
      housingStatus?: string
      carStatus?: string
      maritalStatus?: string
      height?: number
      weight?: number
      occupation?: string
      hometown?: string
      residence?: string
      status?: number
      personalityTags?: string
      hopeTaTags?: string
      onlyChild?: string
      whenMarry?: string
      zodiac?: string
      constellation?: string
      partnerAgeRange?: string
      partnerHeightMin?: string
      partnerEducation?: string
      partnerIncome?: string
      housingRequirement?: string
      partnerMaritalStatus?: string
      acceptChildren?: string
      photoUrls?: string[]
    },
  ) {
    const user = await this.userService.createUser({ ...body, adminId: req.user?.id })
    return Result.success(user, '用户创建成功')
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.userService.updateUser(id, body)
    return Result.success(null, '用户更新成功')
  }

  @Post(':id/regenerate-dynamics')
  async regenerateDynamics(@Param('id', ParseIntPipe) id: number) {
    const result = await this.userService.regenerateUserDynamics(id)
    return Result.success(result)
  }

  // ===== 关注管理（后台手动管理用户的关注和粉丝） =====

  @Get(':id/follow-stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getFollowStats(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.userService.getUserFollowStats(id)
    return Result.success(stats)
  }

  @Get(':id/admin-following')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getUserFollowing(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.userService.getUserFollowingList(id, page, limit)
    return Result.success(result)
  }

  @Get(':id/admin-followers')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getUserFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.userService.getUserFollowersList(id, page, limit)
    return Result.success(result)
  }

  @Post(':id/admin-follow')
  async adminAddFollow(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetUserId: number },
  ) {
    await this.userService.adminAddFollow(id, body.targetUserId)
    return Result.success(null, '添加关注成功')
  }

  @Delete(':id/admin-follow/:targetId')
  async adminRemoveFollow(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    await this.userService.adminRemoveFollow(id, targetId)
    return Result.success(null, '取消关注成功')
  }

  @Post(':id/admin-follower')
  async adminAddFollower(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { followerUserId: number },
  ) {
    await this.userService.adminAddFollow(body.followerUserId, id)
    return Result.success(null, '添加粉丝成功')
  }

  // ===== 浏览记录 =====

  @Get(':id/view-detail')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getUserViewDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.userService.getUserViewDetailGrouped(id)
    return Result.success(result)
  }

  @Get(':id/visitor-detail')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getUserVisitorDetail(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.userService.getUserVisitorDetailGrouped(id)
    return Result.success(result)
  }

  // ===== 运营手动置顶 =====

  @Post(':id/pin')
  async pinUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('durationHours') durationHours: number,
    @Body('boostScore') boostScore?: number,
  ) {
    try {
      const result = await this.vipService.adminPinUser(id, durationHours || 24, boostScore)
      return Result.success(result, '置顶设置成功')
    } catch (error: any) {
      return Result.serverError(error?.message || '置顶设置失败')
    }
  }

  // ===== 喜欢管理（后台手动管理用户的喜欢） =====

  @Get(':id/like-stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getLikeStats(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.userService.getUserLikeStats(id)
    return Result.success(stats)
  }

  @Get(':id/admin-likes')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR, AdminRole.READONLY)
  async getUserLikes(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: string = 'liked',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    if (!['liked', 'likedBy', 'mutual'].includes(type)) {
      return Result.serverError('type 参数必须为 liked / likedBy / mutual')
    }
    const result = await this.userService.getUserLikesList(id, type as 'liked' | 'likedBy' | 'mutual', page, limit)
    return Result.success(result)
  }

  @Post(':id/admin-like')
  async adminAddLike(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { targetUserId: number },
  ) {
    await this.userService.adminAddLike(id, body.targetUserId)
    return Result.success(null, '添加喜欢成功')
  }

  @Delete(':id/admin-like/:targetId')
  async adminRemoveLike(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    await this.userService.adminRemoveLike(id, targetId)
    return Result.success(null, '取消喜欢成功')
  }

  // ===== 标签管理 =====

  @Put('batch/tags')
  async batchUpdateTags(@Body() body: { ids: number[]; tags: string[] }) {
    const count = await this.userService.batchUpdateTags(body.ids, body.tags)
    return Result.success({ updated: count }, `批量标签更新成功，更新 ${count} 人`)
  }

  @Put(':id/tags')
  async updateTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tags: string[] },
  ) {
    const result = await this.userService.updateTags(id, body.tags)
    return Result.success(result, '标签更新成功')
  }
}
