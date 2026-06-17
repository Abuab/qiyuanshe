import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserService } from './user.service'
import { FilterUsersDto } from './dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards'
import { Report, ReportType, ReportReason } from '../entities/Report'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { UserPhoto } from '../entities/UserPhoto'
import { UserBlock } from '../entities/UserBlock'
import { AuditLog } from '../entities/AuditLog'
import { Result } from '../common/result'
import { normalizeImageUrl } from '../common/image-url'
import { DynamicService } from '../dynamic/dynamic.service'
import { NotifyChannelService } from '../admin/notify-channel.service'

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(QuestionAnswer) private answerRepo: Repository<QuestionAnswer>,
    @InjectRepository(UserPhoto) private photoRepo: Repository<UserPhoto>,
    @InjectRepository(UserBlock) private blockRepo: Repository<UserBlock>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    private readonly dynamicService: DynamicService,
    private readonly notifyService: NotifyChannelService,
  ) {}

  @Get('recommend')
  @UseGuards(OptionalJwtAuthGuard)
  async findRecommend(
    @Query('city') city: string = '',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('gender') gender?: number,
    @Query('ageMin') ageMin?: number,
    @Query('ageMax') ageMax?: number,
    @Query('heightMin') heightMin?: number,
    @Query('heightMax') heightMax?: number,
    @Query('education') education?: string,
    @Query('incomeRange') incomeRange?: string,
    @Query('maritalStatus') maritalStatus?: string,
    @Query('isRealName') isRealName?: number,
    @Query('residence') residence?: string,
    @Query('hometown') hometown?: string,
    @Query('keyword') keyword?: string,
    @Request() req?: any,
  ) {
    try {
      const currentUserId = req?.user?.userId

      return this.userService.findRecommend(
        city, page, limit, gender ? Number(gender) : 0, currentUserId,
        { ageMin, ageMax, heightMin, heightMax, education, incomeRange, maritalStatus, isRealName, residence, hometown, keyword },
      )
    } catch (error: any) {
      console.error('findRecommend controller error:', error?.message || error)
      return Result.serverError('推荐数据加载失败，请稍后重试: ' + (error?.message || ''))
    }
  }

  @Post('filter')
  @UseGuards(JwtAuthGuard)
  async filterUsers(@Body() dto: FilterUsersDto, @Request() req: any) {
    const currentUserId = req?.user?.userId
    return this.userService.filterUsers(dto, currentUserId)
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    try {
      const userId = req.user.userId
      const user = await this.userService.updateProfile(userId, dto)
      return Result.success(user, '保存成功')
    } catch (error: any) {
      console.error('updateProfile error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('保存失败: ' + (error?.message || '请稍后重试'))
    }
  }

  @Post('profile-review')
  @UseGuards(JwtAuthGuard)
  async submitProfileReview(@Body() body: any, @Request() req: any) {
    // 创建审核记录到 audit_logs 表
    const userId = req.user.userId
    const auditLog = this.auditLogRepo.create({
      action: 'PENDING',
      targetType: 'user',
      targetId: userId,
      submitterId: userId,
      content: JSON.stringify(body || {}),
    })
    await this.auditLogRepo.save(auditLog)
    return Result.success(null, '已提交审核')
  }

  @Post('avatar-review')
  @UseGuards(JwtAuthGuard)
  async submitAvatarReview(@Body() body: { avatarUrl: string }, @Request() req: any) {
    const userId = req.user.userId
    const auditLog = this.auditLogRepo.create({
      action: 'PENDING',
      targetType: 'avatar',
      targetId: userId,
      submitterId: userId,
      content: JSON.stringify({ url: body.avatarUrl, type: 'avatar' }),
    })
    await this.auditLogRepo.save(auditLog)
    return Result.success(null, '已提交审核')
  }

  @Get('answers')
  @UseGuards(JwtAuthGuard)
  async getUserAnswers(@Request() req: any) {
    const answers = await this.answerRepo.find({
      where: { userId: req.user.userId },
      relations: ['question'],
      order: { createdAt: 'DESC' },
    })
    return Result.success(
      answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        questionTitle: a.question?.title || '',
        content: a.content,
        photos: a.photos || [],
        likeCount: a.likeCount,
        status: a.status,
        createdAt: a.createdAt,
      })),
    )
  }

  // ===== 照片管理 =====

  @Get('photos')
  @UseGuards(JwtAuthGuard)
  async getUserPhotos(@Request() req: any) {
    const photos = await this.photoRepo.find({
      where: { userId: req.user.userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    return Result.success({
      list: photos.map((p) => ({
        ...p,
        photoUrl: normalizeImageUrl(p.photoUrl),
      })),
    })
  }

  @Post('photos')
  @UseGuards(JwtAuthGuard)
  async addPhoto(
    @Body() body: { url: string },
    @Request() req: any,
  ) {
    const userId = req.user.userId
    const count = await this.photoRepo.count({ where: { userId } })
    if (count >= 6) return Result.serverError('最多上传6张照片')
    const isMain = count === 0 ? 1 : 0
    const photo = this.photoRepo.create({ userId, photoUrl: body.url, isMain, sortOrder: count, auditStatus: 0 })
    const saved = await this.photoRepo.save(photo)

    // 创建审核记录
    const auditLog = this.auditLogRepo.create({
      action: 'PENDING',
      targetType: 'photo',
      targetId: saved.id,
      submitterId: userId,
      content: JSON.stringify({ url: body.url, photoId: saved.id }),
    })
    await this.auditLogRepo.save(auditLog)

    // 发送审核通知
    this.notifyService.sendAuditNotify({
      type: 'photo',
      content: `用户 ${req.user.nickname || userId} 上传了新照片`,
      userId,
      userNickname: req.user.nickname || '',
      source: 'photo_upload',
    }).catch(() => {})

    // 自动生成动态：「更新了相册」（最多 3 张）
    const userPhotos = await this.photoRepo.find({ where: { userId }, order: { sortOrder: 'ASC' }, take: 3 })
    const photoUrls = userPhotos.map((p) => normalizeImageUrl(p.photoUrl))
    this.dynamicService.autoCreateDynamic({
      userId,
      type: 'photo',
      content: '更新了相册',
      images: photoUrls,
    }).catch(() => {})

    return Result.success(saved)
  }

  @Post('photos/:id/main')
  @UseGuards(JwtAuthGuard)
  async setMainPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId
    await this.photoRepo.update({ userId, isMain: 1 }, { isMain: 0 })
    await this.photoRepo.update({ id, userId }, { isMain: 1 })
    return Result.success(null, '已设置主图')
  }

  @Delete('photos/:id')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId
    const photo = await this.photoRepo.findOne({ where: { id, userId } })
    if (!photo) return Result.serverError('照片不存在')
    await this.photoRepo.remove(photo)
    return Result.success(null, '已删除')
  }

  // ===== 我的关注列表（当前用户关注的用户） =====

  @Get('follows')
  @UseGuards(JwtAuthGuard)
  async getMyFollows(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getFollowing(req.user.userId, page, limit)
  }

  @Get('followers')
  @UseGuards(JwtAuthGuard)
  async getMyFollowers(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getFollowers(req.user.userId, page, limit)
  }

  // ===== 谁看过我（访客列表） =====

  @Get('visitors')
  @UseGuards(JwtAuthGuard)
  async getMyVisitors(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getMyVisitorsWithCount(req.user.userId, page, limit)
  }

  // ===== 我看过谁（浏览记录） =====

  @Get('my-views')
  @UseGuards(JwtAuthGuard)
  async getMyViews(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getMyViews(req.user.userId, page, limit)
  }

  // ===== 注销账户 =====

  @Put('deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(@Request() req: any) {
    await this.userService.deactivateAccount(req.user.userId)
    return Result.success(null, '账户已注销')
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Request() req: any) {
    return this.userService.getUserStats(req.user.userId)
  }

  @Get(':id')
  async getUserDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: any,
  ) {
    try {
      const currentUserId = req?.user?.userId
      return this.userService.getUserDetail(id, currentUserId)
    } catch (error: any) {
      console.error('getUserDetail error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.notFound(error?.message || '用户不存在')
    }
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId
      await this.userService.followUser(userId, targetUserId)
      return Result.success(null, '关注成功')
    } catch (error: any) {
      console.error('followUser error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('关注失败: ' + (error?.message || '请稍后重试'))
    }
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId
      await this.userService.unfollowUser(userId, targetUserId)
      return Result.success(null, '取消关注成功')
    } catch (error: any) {
      console.error('unfollowUser error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('取消关注失败: ' + (error?.message || '请稍后重试'))
    }
  }

  @Post(':id/block')
  @UseGuards(JwtAuthGuard)
  async blockUser(
    @Param('id', ParseIntPipe) blockedUserId: number,
    @Request() req: any,
  ) {
    try {
      const blockerId = req.user.userId
      if (blockerId === blockedUserId) return Result.serverError('不能拉黑自己')
      const exists = await this.blockRepo.findOne({ where: { blockerId, blockedUserId } })
      if (exists) return Result.success(null, '已拉黑')
      const block = this.blockRepo.create({ blockerId, blockedUserId })
      await this.blockRepo.save(block)
      return Result.success(null, '已拉黑')
    } catch (error: any) {
      console.error('blockUser error:', error?.message || error)
      return Result.serverError('拉黑失败')
    }
  }

  @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard)
  async getFollowStatus(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId
      const result = await this.userService.getFollowStatus(userId, targetUserId)
      return Result.success(result)
    } catch (error: any) {
      console.error('getFollowStatus error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('查询失败: ' + (error?.message || ''))
    }
  }

  @Get(':id/followers')
  async getFollowers(
    @Param('id', ParseIntPipe) userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getFollowers(userId, page, limit)
  }

  @Get(':id/following')
  async getFollowing(
    @Param('id', ParseIntPipe) userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getFollowing(userId, page, limit)
  }

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  async createReport(
    @Body() body: { targetId: number; type: string; reason: string; description?: string; evidence?: string },
    @Request() req: any,
  ) {
    const report = this.reportRepo.create({
      reporterId: req.user.userId,
      targetId: body.targetId,
      type: body.type as ReportType,
      reason: body.reason as ReportReason,
      description: body.description,
      evidence: body.evidence,
    })
    await this.reportRepo.save(report)
    return Result.success(null, '举报已提交')
  }
}
