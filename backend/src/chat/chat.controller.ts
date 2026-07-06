import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common'
import { ChatService } from './chat.service'
import { SendMessageDto, QueryMessagesDto, QueryConversationsDto, PollMessagesDto } from './dto'
import { JwtAuthGuard } from '../auth/guards'

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto, @Request() req: any) {
    // 修复 P1：将 req.user 完整传给 service，让 service 根据角色决定是否重置代发字段
    const message = await this.chatService.sendMessage(req.user.id, dto, req.user)

    return {
      success: true,
      data: message,
    }
  }

  @Get('messages/poll')
  async pollMessages(@Query() dto: PollMessagesDto, @Request() req: any) {
    const list = await this.chatService.pollMessages(req.user.id, dto)

    return {
      success: true,
      list,
    }
  }

  @Get('messages')
  async getMessages(@Query() dto: QueryMessagesDto, @Request() req: any) {
    const result = await this.chatService.getMessages(req.user.id, dto)

    return {
      success: true,
      ...result,
    }
  }

  @Get('conversations')
  async getConversations(@Query() dto: QueryConversationsDto, @Request() req: any) {
    const result = await this.chatService.getConversations(req.user.id, dto)

    return {
      success: true,
      ...result,
    }
  }

  @Put('messages/:userId/read')
  async markAsRead(@Param('userId', ParseIntPipe) userId: number, @Request() req: any) {
    await this.chatService.markAsRead(req.user.id, userId)

    return {
      success: true,
    }
  }

  @Delete('conversations/:userId')
  async deleteConversation(@Param('userId', ParseIntPipe) userId: number, @Request() req: any) {
    await this.chatService.deleteConversation(req.user.id, userId)

    return {
      success: true,
    }
  }

  @Delete('conversations')
  async clearAllConversations(@Request() req: any) {
    await this.chatService.clearAllConversations(req.user.id)

    return {
      success: true,
    }
  }
}
