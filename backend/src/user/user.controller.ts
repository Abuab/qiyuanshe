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
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { UserService } from './user.service'
import { UserProfileDetailService } from './user-profile-detail.service'
import { FilterUsersDto } from './dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards'
import { Report, ReportType, ReportReason } from '../entities/Report'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { User } from '../entities/User'
import { UserPhoto } from '../entities/UserPhoto'
import { UserBlock } from '../entities/UserBlock'
import { AuditLog } from '../entities/AuditLog'
import { MatchRecord } from '../entities/MatchRecord'
import { Follow } from '../entities/Follow'
import { Result } from '../common/result'
import { getDisplayName } from '../common/user-utils'
import { normalizeImageUrl } from '../common/image-url'
import { DynamicService } from '../dynamic/dynamic.service'
import { NotifyChannelService } from '../admin/notify-channel.service'
import { RedisService } from '../common/redis.service'

/** 限流：照片每天最多 50 张 */
const PHOTO_RATE_LIMIT_MAX = 50
/** 限流：头像每天最多 10 次修改 */
const AVATAR_RATE_LIMIT_MAX = 10
/** 限流窗口：24 小时 */
const RATE_LIMIT_WINDOW_SEC = 86400

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly profileDetailService: UserProfileDetailService,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(QuestionAnswer) private answerRepo: Repository<QuestionAnswer>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserPhoto) private photoRepo: Repository<UserPhoto>,
    @InjectRepository(UserBlock) private blockRepo: Repository<UserBlock>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(MatchRecord) private matchRecordRepo: Repository<MatchRecord>,
    @InjectRepository(Follow) private followRepo: Repository<Follow>,
    private readonly dynamicService: DynamicService,
    private readonly notifyService: NotifyChannelService,
    private readonly redisService?: RedisService,
  ) {}

  @Get('recommend')
  @UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
  async findRecommend(
    @Query('city') city: string = '',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('gender') gender?: number,
    @Query('tab') tab?: string,
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

      const rn = isRealName !== undefined && isRealName !== null ? Number(isRealName) : NaN
      const effectiveIsRealName = !Number.isNaN(rn) ? rn : undefined
      return this.userService.findRecommend(
        city, page, limit, gender ? Number(gender) : 0, currentUserId,
        { tab, ageMin, ageMax, heightMin, heightMax, education, incomeRange, maritalStatus, isRealName: effectiveIsRealName, residence, hometown, keyword },
      )
    } catch (error: any) {
      console.error('findRecommend controller error:', error?.message || error)
      return Result.serverError('推荐数据加载失败，请稍后重试: ' + (error?.message || ''))
    }
  }

  @Post('filter')
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  async filterUsers(@Body() dto: FilterUsersDto, @Request() req: any) {
    const currentUserId = req?.user?.userId
    return this.userService.filterUsers(dto, currentUserId)
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    try {
      const userId = req.user.id
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
    const userId = req.user.id
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
    const userId = req.user.id

    // ===== 修改点 B：头像上传限流（Redis 计数器，每天 10 次） =====
    if (this.redisService) {
      const rateLimitKey = `rate_limit:avatar:user_${userId}`
      try {
        const currentCount = await this.redisService.incr(rateLimitKey)
        if (currentCount === 1) {
          await this.redisService.expire(rateLimitKey, RATE_LIMIT_WINDOW_SEC)
        }
        if (currentCount > AVATAR_RATE_LIMIT_MAX) {
          throw new ForbiddenException('今日修改头像次数已达上限，请明天再试')
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e
        console.error('Redis 限流检查失败，降级放行:', e)
      }
    }

    const auditLog = this.auditLogRepo.create({
      action: 'PENDING',
      targetType: 'avatar',
      targetId: userId,
      submitterId: userId,
      content: JSON.stringify({ url: body.avatarUrl, type: 'avatar' }),
    })
    await this.auditLogRepo.save(auditLog)
    // 标记头像为待审核状态
    await this.userRepo.update(userId, { avatarReviewStatus: 0, avatar: body.avatarUrl })
    // 发送即时审核通知（与照片上传流程一致）
    this.notifyService.sendAuditNotify({
      type: 'photo',
      content: `用户 ${req.user.nickname || userId} 提交了头像审核`,
      userId,
      userNickname: req.user.nickname || '',
      source: 'avatar_upload',
    }).catch(() => {})
    return Result.success(null, '已提交审核')
  }

  @Get('answers')
  @UseGuards(JwtAuthGuard)
  async getUserAnswers(@Request() req: any) {
    const answers = await this.answerRepo.find({
      where: { userId: req.user.id },
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
      where: { userId: req.user.id },
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
    const userId = req.user.id

    // ===== 修改点 A：照片上传限流（Redis 计数器，每天 50 张） =====
    if (this.redisService) {
      const rateLimitKey = `rate_limit:photo:user_${userId}`
      try {
        const currentCount = await this.redisService.incr(rateLimitKey)
        if (currentCount === 1) {
          await this.redisService.expire(rateLimitKey, RATE_LIMIT_WINDOW_SEC)
        }
        if (currentCount > PHOTO_RATE_LIMIT_MAX) {
          throw new ForbiddenException('今日上传照片已达上限，请明天再试')
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e
        console.error('Redis 限流检查失败，降级放行:', e)
      }
    }

    const count = await this.photoRepo.count({ where: { userId } })
    if (count >= 6) return Result.serverError('最多上传6张照片')

    // 第一张照片自动设为头像，并更新更新时间（repo.update 不触发 @UpdateDateColumn）
    if (count === 0) {
      const now = new Date()
      await this.userRepo.update(userId, { avatar: body.url, updatedAt: now })
    }

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
    const userId = req.user.id
    await this.photoRepo.update({ userId, isMain: 1 }, { isMain: 0 })
    await this.photoRepo.update({ id, userId }, { isMain: 1 })

    // 设为主图时同步更新用户头像，并更新 updatedAt
    const mainPhoto = await this.photoRepo.findOne({ where: { id, userId } })
    if (mainPhoto?.photoUrl) {
      const now = new Date()
      await this.userRepo.update(userId, { avatar: mainPhoto.photoUrl, updatedAt: now })
    }

    return Result.success(null, '已设置主图')
  }

  @Delete('photos/:id')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const userId = req.user.id
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
    return this.userService.getFollowing(req.user.id, page, limit)
  }

  @Get('followers')
  @UseGuards(JwtAuthGuard)
  async getMyFollowers(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getFollowers(req.user.id, page, limit)
  }

  // ===== 谁看过我（访客列表） =====

  @Get('visitors')
  @UseGuards(JwtAuthGuard)
  async getMyVisitors(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getMyVisitorsWithCount(req.user.id, page, limit)
  }

  // ===== 我看过谁（浏览记录） =====

  @Get('my-views')
  @UseGuards(JwtAuthGuard)
  async getMyViews(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getMyViews(req.user.id, page, limit)
  }

  // ===== 注销账户 =====

  @Put('deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateAccount(@Request() req: any) {
    await this.userService.deactivateAccount(req.user.id)
    return Result.success(null, '账户已注销')
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelAccount(@Request() req: any) {
    await this.userService.cancelAccount(req.user.id)
    return Result.success(null, '账户已注销')
  }

  @Get('matches')
  @UseGuards(JwtAuthGuard)
  async getMatches(@Request() req: any) {
    const userId = req.user.id
    const records = await this.matchRecordRepo.find({
      where: { userId },
      relations: ['matchedUser'],
      order: { createdAt: 'DESC' },
    })
    const list = records.map(r => ({
      id: r.matchedUserId,
      matchedUserId: r.matchedUserId,
      userId: r.matchedUser?.userId || '',
      nickname: r.matchedUser?.nickname || '',
      displayName: getDisplayName(r.matchedUser?.nickname, r.matchedUser?.userId),
      avatar: r.matchedUser?.avatar || '',
      createdAt: r.createdAt,
    }))
    return Result.success({ list, total: list.length })
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Request() req: any) {
    return this.userService.getUserStats(req.user.id)
  }

  /** 获取我的黑名单列表 */
  @Get('my-blocks')
  @UseGuards(JwtAuthGuard)
  async getMyBlocks(@Request() req: any) {
    const userId = req.user.id
    const blocks = await this.blockRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.blockedUser', 'u')
      .where('b.blockerId = :userId', { userId })
      .select([
        'b.id', 'b.createdAt',
        'u.id', 'u.userId', 'u.nickname', 'u.avatar', 'u.isRealName',
      ])
      .orderBy('b.createdAt', 'DESC')
      .getMany()

    const list = blocks.map(b => ({
      id: b.id,
      blockedUserId: b.blockedUser?.id,
      userId: b.blockedUser?.userId || '',
      nickname: b.blockedUser?.nickname || '用户',
      displayName: getDisplayName(b.blockedUser?.nickname, b.blockedUser?.userId),
      avatar: b.blockedUser?.avatar || '',
      isRealName: b.blockedUser?.isRealName || 0,
      createdAt: b.createdAt,
    }))

    return Result.success(list)
  }

  @Get('likes')
  @UseGuards(JwtAuthGuard)
  async getMyLikes(
    @Request() req: any,
    @Query('type') type: string = 'liked',
  ) {
    try {
      const userId = req.user.id
      if (!['liked', 'likedBy', 'mutual'].includes(type)) {
        return Result.serverError('type 参数必须为 liked / likedBy / mutual')
      }
      const list = await this.userService.getMyLikes(userId, type as 'liked' | 'likedBy' | 'mutual')
      return Result.success(list)
    } catch (error: any) {
      console.error('getMyLikes error:', error?.message || error)
      return Result.serverError('查询失败')
    }
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
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

  /** 新版用户详情页完整数据（对标竞品飘飘个人主页，7分区结构） */
  @Get(':id/detail')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserProfileDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: any,
  ) {
    const currentUserId = req?.user?.userId
    const data = await this.profileDetailService.getUserProfileDetail(id, currentUserId)
    return Result.success(data)
  }

  /** 上传语音介绍 */
  @Post('voice-intro')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('voiceFile', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `voice-${uniqueSuffix}${extname(file.originalname) || '.mp3'}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 2, // 2MB
      },
      fileFilter: (_req, file, cb) => {
        const allowedMime = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/x-wav']
        if (allowedMime.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传语音文件'), false)
        }
      },
    }),
  )
  async uploadVoiceIntro(@UploadedFile() file: any, @Request() req: any) {
    if (!file) {
      return Result.error('请选择音频文件')
    }
    const envBaseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    // 优先使用环境变量，否则基于请求头拼接绝对路径（兼容反向代理）
    const protocol = req.get('x-forwarded-proto') || req.protocol
    const host = req.get('x-forwarded-host') || req.get('host')
    const baseUrl = envBaseUrl || `${protocol}://${host}`
    const voiceUrl = `${baseUrl}/uploads/${file.filename}`

    // 只上传文件并返回 URL，不写入用户资料（由前端保存时统一提交）
    return Result.success({ voiceUrl, auditStatus: 0 })
  }

  /** 获取用户语音介绍 */
  @Get(':id/voice-intro')
  async getVoiceIntro(@Param('id', ParseIntPipe) id: number) {
    const data = await this.userService.getVoiceIntro(id)
    return Result.success(data)
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id
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
      const userId = req.user.id
      await this.userService.unfollowUser(userId, targetUserId)
      return Result.success(null, '取消关注成功')
    } catch (error: any) {
      console.error('unfollowUser error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('取消关注失败: ' + (error?.message || '请稍后重试'))
    }
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id
      if (userId === targetUserId) return Result.serverError('不能喜欢自己')

      await this.followRepo.manager.transaction(async (manager) => {
        const existing = await manager.findOne(Follow, { where: { userId, targetUserId } })
        if (existing) return
        const follow = manager.create(Follow, { userId, targetUserId })
        await manager.save(follow)
      })

      // 检查是否互相喜欢（匹配成功）
      const reverse = await this.followRepo.findOne({ where: { userId: targetUserId, targetUserId: userId } })
      const isMatched = !!reverse
      if (isMatched && reverse) {
        const targetUser = await this.userRepo.findOne({ where: { id: targetUserId }, select: ['id', 'nickname', 'avatar'] })
        return Result.success({ isMatched: true, matchUser: targetUser })
      }

      return Result.success({ isMatched: false })
    } catch (error: any) {
      console.error('likeUser error:', error?.message || error)
      if (error.getStatus) throw error
      return Result.serverError('操作失败')
    }
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikeUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id
      await this.followRepo.delete({ userId, targetUserId })
      return Result.success(null)
    } catch (error: any) {
      console.error('unlikeUser error:', error?.message || error)
      return Result.serverError('操作失败')
    }
  }

  @Post(':id/block')
  @UseGuards(JwtAuthGuard)
  async blockUser(
    @Param('id', ParseIntPipe) blockedUserId: number,
    @Request() req: any,
  ) {
    try {
      const blockerId = req.user.id
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

  @Delete(':id/block')
  @UseGuards(JwtAuthGuard)
  async unblockUser(
    @Param('id', ParseIntPipe) blockedUserId: number,
    @Request() req: any,
  ) {
    try {
      const blockerId = req.user.id
      await this.blockRepo.delete({ blockerId, blockedUserId })
      return Result.success(null, '已移出黑名单')
    } catch (error: any) {
      return Result.serverError('操作失败: ' + (error?.message || ''))
    }
  }

  @Get(':id/follow-status')
  @UseGuards(JwtAuthGuard)
  async getFollowStatus(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.id
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
      reporterId: req.user.id,
      targetId: body.targetId,
      type: body.type as ReportType,
      reason: body.reason as ReportReason,
      description: body.description,
      evidence: body.evidence,
    })
    await this.reportRepo.save(report)
    return Result.success(null, '举报已提交')
  }

  /** 记录用户协议同意/不同意 */
  @Post('agreement')
  @UseGuards(JwtAuthGuard)
  async recordAgreement(
    @Body() body: { agreementType: string; version: string; action: string },
    @Request() req: any,
  ) {
    const userId = req.user.id
    const ip = req.headers['x-forwarded-for'] || req.ip || ''
    const ipAddress = typeof ip === 'string' ? ip.split(',')[0].trim() : ''
    const userAgent = (req.headers['user-agent'] || '') as string
    await this.userService.recordAgreement(
      userId,
      body.agreementType,
      body.version,
      body.action,
      ipAddress,
      userAgent,
    )
    return Result.success(null, '已记录')
  }
}
