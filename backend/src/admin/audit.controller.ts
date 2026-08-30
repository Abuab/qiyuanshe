import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminAuditService } from './audit.service'
import { NotifyChannelService } from './notify-channel.service'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

interface AuditFilter {
  page?: number
  limit?: number
  type?: string
  status?: number
  startDate?: string
  endDate?: string
}

@Controller('admin/audit')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminAuditController {
  constructor(
    private readonly auditService: AdminAuditService,
    private readonly notifyService: NotifyChannelService,
  ) {}

  private targetTypeLabel(targetType: string): string {
    switch (targetType) {
      case 'avatar': return '头像'
      case 'photo': return '图片'
      case 'user': return '资料修改'
      case 'user_create': return '用户创建'
      case 'answer': return '回答'
      case 'voice': return '语音'
      default: return '内容'
    }
  }

  @Get('list')
  async list(@Query() filter: AuditFilter) {
    const result = await this.auditService.list(filter)
    return Result.success(result)
  }

  @Get('pending-count')
  async pendingCount() {
    const count = await this.auditService.getPendingCount()
    return Result.success(count)
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body('reason') reason?: string,
  ) {
    await this.auditService.approve(id, reason)
    const audit = await this.auditService.getById(id)
    if (audit) {
      let notifyUserId = audit.targetId
      let notifyNickname = ''
      if (audit.targetType === 'photo') {
        const photoInfo = await this.auditService.getPhotoInfo(audit.targetId)
        if (photoInfo) {
          notifyUserId = photoInfo.userId
          notifyNickname = photoInfo.nickname || ''
        }
      } else if (audit.targetType === 'avatar') {
        const userInfo = await this.auditService.getUserInfo(audit.targetId)
        if (userInfo) {
          notifyNickname = userInfo.nickname || ''
        }
      } else if (audit.targetType === 'answer') {
        const answerInfo = await this.auditService.getAnswerInfo(audit.targetId)
        if (answerInfo) {
          notifyUserId = answerInfo.userId
          notifyNickname = answerInfo.nickname || ''
        }
      }
      // voice 类型不发送审核通过/拒绝通知（仅 user.service 中提交时发送 voice_upload 通知）
      if (audit.targetType !== 'voice') {
        const notifyType = audit.targetType === 'avatar' ? 'photo' : audit.targetType
        const adminName = req.user?.username || ''
        this.notifyService.sendAuditNotify({
          type: notifyType,
          content: `${this.targetTypeLabel(audit.targetType)}审核已通过，审核ID: ${id}，对象ID: ${audit.targetId}，处理人: ${adminName || '未知'}`,
          userId: notifyUserId,
          userNickname: notifyNickname,
          source: `${audit.targetType}_audit`,
          auditStatus: 1,
          adminName,
        }).catch(() => {})
      }
    }
    return Result.success(null, '审核通过')
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    await this.auditService.reject(id, reason)
    const audit = await this.auditService.getById(id)
    if (audit) {
      let notifyUserId = audit.targetId
      let notifyNickname = ''
      if (audit.targetType === 'photo') {
        const photoInfo = await this.auditService.getPhotoInfo(audit.targetId)
        if (photoInfo) {
          notifyUserId = photoInfo.userId
          notifyNickname = photoInfo.nickname || ''
        }
      } else if (audit.targetType === 'avatar') {
        const userInfo = await this.auditService.getUserInfo(audit.targetId)
        if (userInfo) {
          notifyNickname = userInfo.nickname || ''
        }
      } else if (audit.targetType === 'answer') {
        const answerInfo = await this.auditService.getAnswerInfo(audit.targetId)
        if (answerInfo) {
          notifyUserId = answerInfo.userId
          notifyNickname = answerInfo.nickname || ''
        }
      }
      // voice 类型不发送审核通过/拒绝通知
      if (audit.targetType !== 'voice') {
        const notifyType = audit.targetType === 'avatar' ? 'photo' : audit.targetType
        const adminName = req.user?.username || ''
        this.notifyService.sendAuditNotify({
          type: notifyType,
          content: `${this.targetTypeLabel(audit.targetType)}审核已被拒绝，原因: ${reason || '未填写'}，审核ID: ${id}，对象ID: ${audit.targetId}，处理人: ${adminName || '未知'}`,
          userId: notifyUserId,
          userNickname: notifyNickname,
          source: `${audit.targetType}_audit`,
          auditStatus: 2,
          adminName,
        }).catch(() => {})
      }
    }
    return Result.success(null, '已拒绝')
  }

  @Post('batch-approve')
  async batchApprove(@Body('ids') ids: number[]) {
    await this.auditService.batchApprove(ids)
    return Result.success(null, '批量通过成功')
  }

  @Post('batch-reject')
  async batchReject(@Body() body: { ids: number[]; reason: string }) {
    await this.auditService.batchReject(body.ids, body.reason)
    return Result.success(null, '批量拒绝成功')
  }

  @Get('history/:type/:targetId')
  async getHistory(
    @Param('type') type: string,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    const history = await this.auditService.getHistory(type, targetId)
    return Result.success(history)
  }

  @Post('voice-audit')
  async voiceAudit(@Body() body: { userId: number; status: number; remark?: string }) {
    await this.auditService.voiceAudit(body.userId, body.status, body.remark)
    // voice 审核通过/拒绝不发送通知（仅 user.service 中提交时发送 voice_upload 通知）
    return Result.success(null, body.status === 1 ? '语音审核通过' : '语音已拒绝')
  }
}
