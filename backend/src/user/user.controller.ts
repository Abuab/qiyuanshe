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
import { JwtAuthGuard } from '../auth/guards'
import { Report, ReportType, ReportReason } from '../entities/Report'
import { QuestionAnswer } from '../entities/QuestionAnswer'
import { Result } from '../common/result'

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(QuestionAnswer) private answerRepo: Repository<QuestionAnswer>,
  ) {}

  @Get('recommend')
  async findRecommend(
    @Query('tab') tab: string = 'active',
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
        tab, page, limit, gender, currentUserId,
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
