import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminChatService } from './chat.service'
import { Result } from '../common/result'

@Controller('admin/chat')
@Roles('super_admin', 'operator')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminChatController {
  constructor(private readonly chatService: AdminChatService) {}

  /** 所有用户的会话列表 */
  @Get('conversations')
  async getAllConversations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('keyword') keyword?: string,
  ) {
    const result = await this.chatService.getAllConversations({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      keyword,
    })
    return Result.success(result)
  }

  /** 两个用户之间的聊天记录 */
  @Get('conversations/:fromUserId/:toUserId')
  async getMessages(
    @Param('fromUserId', ParseIntPipe) fromUserId: number,
    @Param('toUserId', ParseIntPipe) toUserId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatService.getMessages(
      fromUserId,
      toUserId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    )
    return Result.success(result)
  }

  /** 某用户的所有会话 */
  @Get('user/:userId/conversations')
  async getUserConversations(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatService.getUserConversations(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    )
    return Result.success(result)
  }
}
