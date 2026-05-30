import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common'
import { UserService } from './user.service'
import { FilterUsersDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('recommend')
  async findRecommend(
    @Query('tab') tab: string = 'active',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('gender') gender?: number,
    @Request() req?: any,
  ) {
    const currentUserId = req?.user?.userId
    return this.userService.findRecommend(tab, page, limit, gender, currentUserId)
  }

  @Post('filter')
  @UseGuards(JwtAuthGuard)
  async filterUsers(@Body() dto: FilterUsersDto, @Request() req: any) {
    const currentUserId = req?.user?.userId
    return this.userService.filterUsers(dto, currentUserId)
  }

  @Get(':id')
  async getUserDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: any,
  ) {
    const currentUserId = req?.user?.userId
    return this.userService.getUserDetail(id, currentUserId)
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId
    await this.userService.followUser(userId, targetUserId)
    return { success: true, message: '关注成功' }
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowUser(
    @Param('id', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId
    await this.userService.unfollowUser(userId, targetUserId)
    return { success: true, message: '取消关注成功' }
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
}
