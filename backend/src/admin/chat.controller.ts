import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Request,
  UseGuards,
  ParseIntPipe,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminChatService } from './chat.service'
import { ChatMonitorService } from '../chat/chat-monitor.service'
import { ChatMonitorGateway } from '../chat/chat-monitor.gateway'
import { Result } from '../common/result'
import { beijingISO } from '../common/utils/date-utils'
import { AdminRole } from '../shared/enums'

@Controller('admin/chat')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminChatController {
  constructor(
    private readonly chatService: AdminChatService,
    private readonly monitorService: ChatMonitorService,
    @Optional()
    @Inject(forwardRef(() => ChatMonitorGateway))
    private readonly monitorGateway?: ChatMonitorGateway,
  ) {}

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
  async getConversationMessages(
    @Param('fromUserId', ParseIntPipe) fromUserId: number,
    @Param('toUserId', ParseIntPipe) toUserId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('beforeId') beforeId?: number,
  ) {
    const result = await this.chatService.getMessages(
      fromUserId,
      toUserId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      beforeId ? Number(beforeId) : undefined,
    )
    return Result.success(result)
  }

  /** 轮询增量拉取新消息（监控页面用） */
  @Get('messages')
  async pollMessages(
    @Query('userId') userId: string,
    @Query('targetUserId') targetUserId: string,
    @Query('lastMessageId') lastMessageId?: string,
  ) {
    const result = await this.chatService.pollMessages(
      Number(userId),
      Number(targetUserId),
      lastMessageId ? Number(lastMessageId) : 0,
    )
    return Result.success(result)
  }

  /** 通过公开 userId 解析用户（监控页搜索用） */
  @Get('resolve-user')
  async resolveUser(@Query('publicId') publicId: string) {
    const user = await this.chatService.resolveUserByPublicId(publicId)
    if (!user) return Result.error('未找到该用户', 404)
    return Result.success(user)
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

  // ==================== 聊天监控 ====================

  /** 开始监控 */
  @Post('monitor/start')
  async startMonitor(
    @Body('targetUserId') targetUserId: number,
    @Request() req: any,
  ) {
    const operatorId = req.user.id
    const result = await this.monitorService.tryLockTarget(operatorId, targetUserId)
    if (!result.success) {
      return Result.error(result.message || '锁定失败', 409)
    }
    return Result.success({ sessionId: result.sessionId }, '监控已开始')
  }

  /** 结束监控 */
  @Post('monitor/end')
  async endMonitor(
    @Body('targetUserId') targetUserId: number,
    @Request() req: any,
  ) {
    await this.monitorService.endMonitor(req.user.id, targetUserId)
    return Result.success(null, '监控已结束')
  }

  /** 获取用户活跃监控状态 */
  @Get('monitor/status/:userId')
  async getMonitorStatus(@Param('userId', ParseIntPipe) userId: number) {
    const status = await this.monitorService.getActiveMonitor(userId)
    return Result.success(status)
  }

  /** 代发消息 */
  @Post('proxy/send')
  async proxySend(
    @Body('targetUserId') targetUserId: number,
    @Body('toUserId') toUserId: number,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    if (!content || !content.trim()) {
      return Result.error('消息内容不能为空', 400)
    }

    const operatorId = req.user.id
    const operatorName = req.user.nickname || '运营人员'

    const message = await this.monitorService.sendProxyMessage(
      operatorId,
      operatorName,
      targetUserId,
      toUserId,
      content.trim(),
    )

    // 通过 WebSocket 实时推送给管理员和用户端
    const msgPayload = {
      id: message.id,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      content: message.content,
      type: message.type,
      isMine: false,
      isProxy: 1,
      proxyName: operatorName,
      createdAt: message.createdAt ? beijingISO(message.createdAt) : undefined,
    }

    // 推送消息给监控该用户的管理员
    this.monitorGateway?.notifyAdmin(targetUserId, msgPayload)
    // 推送消息给 toUserId 的订阅管理员（双向聊天）
    this.monitorGateway?.notifyAdmin(toUserId, msgPayload)

    return Result.success(msgPayload, '消息已代发')
  }

  /** 操作日志查询 */
  @Get('operation-logs')
  async getOperationLogs(
    @Query('operatorId') operatorId?: number,
    @Query('targetUserId') targetUserId?: number,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.monitorService.getOperationLogs({
      operatorId: operatorId ? Number(operatorId) : undefined,
      targetUserId: targetUserId ? Number(targetUserId) : undefined,
      action,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
    return Result.success(result)
  }

  /** 活跃监控会话列表 */
  @Get('monitor/active')
  async getActiveSessions() {
    const list = await this.monitorService.getActiveSessions()
    return Result.success(list)
  }
}
