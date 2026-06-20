import { Injectable, Logger, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual } from 'typeorm'
import { ChatMonitorSession, MonitorStatus } from '../entities/ChatMonitorSession'
import { ChatOperationLog, ChatOpAction } from '../entities/ChatOperationLog'
import { ChatMessage } from '../entities/ChatMessage'

const MONITOR_TIMEOUT_MS = 30 * 60 * 1000 // 30 分钟超时

@Injectable()
export class ChatMonitorService {
  private readonly logger = new Logger(ChatMonitorService.name)

  constructor(
    @InjectRepository(ChatMonitorSession)
    private readonly sessionRepo: Repository<ChatMonitorSession>,
    @InjectRepository(ChatOperationLog)
    private readonly opLogRepo: Repository<ChatOperationLog>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
  ) {}

  /**
   * 尝试锁定目标用户（一个用户同时只能被一个运营人员监控）
   */
  async tryLockTarget(
    operatorId: number,
    targetUserId: number,
  ): Promise<{ success: boolean; sessionId?: number; message?: string; lockedBy?: string }> {
    // 检查是否有正在进行的监控会话
    const existing = await this.sessionRepo.findOne({
      where: { targetUserId, status: MonitorStatus.ACTIVE },
      relations: ['operator'],
    })

    if (existing) {
      const timeoutAt = new Date(existing.updatedAt).getTime() + MONITOR_TIMEOUT_MS
      if (Date.now() > timeoutAt) {
        // 超时，自动结束旧会话
        existing.status = MonitorStatus.TIMEOUT
        existing.endedAt = new Date()
        await this.sessionRepo.save(existing)
        this.logger.log(`监控会话 #${existing.id} 超时自动结束 (target=${targetUserId})`)
      } else if (existing.operatorId === operatorId) {
        // 同一运营人员，复用会话
        existing.updatedAt = new Date()
        await this.sessionRepo.save(existing)
        return { success: true, sessionId: existing.id }
      } else {
        return {
          success: false,
          message: `该用户正在被 ${existing.operator?.nickname || '其他运营人员'} 监控`,
          lockedBy: existing.operator?.nickname || '其他运营人员',
        }
      }
    }

    // 创建新会话
    const session = this.sessionRepo.create({
      operatorId,
      targetUserId,
      status: MonitorStatus.ACTIVE,
    })
    const saved = await this.sessionRepo.save(session)

    // 记录操作日志
    await this.writeOpLog(operatorId, ChatOpAction.START_MONITOR, targetUserId, null, null)

    return { success: true, sessionId: saved.id }
  }

  /** 结束监控 */
  async endMonitor(operatorId: number, targetUserId: number): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { targetUserId, operatorId, status: MonitorStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    })

    if (!session) return

    session.status = MonitorStatus.ENDED
    session.endedAt = new Date()
    await this.sessionRepo.save(session)

    await this.writeOpLog(operatorId, ChatOpAction.END_MONITOR, targetUserId, null, null)
  }

  /**
   * 运营人员以某用户身份代发消息
   *
   * @param operatorId 运营人员 ID
   * @param operatorName 运营人员名称
   * @param targetUserId 代发源用户 ID（以谁的身份发送）
   * @param toUserId 聊天对象 ID
   * @param content 消息内容
   */
  async sendProxyMessage(
    operatorId: number,
    operatorName: string,
    targetUserId: number,
    toUserId: number,
    content: string,
  ): Promise<ChatMessage> {
    // 验证监控会话状态
    const session = await this.sessionRepo.findOne({
      where: { targetUserId, operatorId, status: MonitorStatus.ACTIVE },
    })

    if (!session) {
      throw new ForbiddenException('监控会话已结束，无法代发消息。请重新开始监控。')
    }

    // 刷新活跃时间
    session.updatedAt = new Date()
    await this.sessionRepo.save(session)

    // 创建消息（fromUserId = targetUserId，用户端看到来自 targetUser）
    const message = this.messageRepo.create({
      fromUserId: targetUserId,
      toUserId,
      content,
      type: 'text',
      isRead: 0,
      isProxy: 1,
      proxyBy: operatorId,
      proxyName: operatorName,
      proxyTime: new Date(),
    })

    const saved = await this.messageRepo.save(message)

    // 记录操作日志
    const logContent = content.length > 100 ? content.slice(0, 100) + '...' : content
    await this.writeOpLog(
      operatorId,
      ChatOpAction.SEND_PROXY_MSG,
      targetUserId,
      toUserId,
      logContent,
    )

    return saved
  }

  /**
   * 获取用户的活跃监控状态（用于显示"正在被监控"提示）
   */
  async getActiveMonitor(targetUserId: number): Promise<{
    active: boolean
    operatorName?: string
  }> {
    const session = await this.sessionRepo.findOne({
      where: { targetUserId, status: MonitorStatus.ACTIVE },
      relations: ['operator'],
    })

    if (!session) return { active: false }

    const timeoutAt = new Date(session.updatedAt).getTime() + MONITOR_TIMEOUT_MS
    if (Date.now() > timeoutAt) return { active: false }

    return {
      active: true,
      operatorName: session.operator?.nickname || '运营人员',
    }
  }

  /** 获取操作日志列表 */
  async getOperationLogs(params: {
    operatorId?: number
    targetUserId?: number
    action?: string
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
  }) {
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(100, Math.max(1, params.limit || 20))
    const skip = (page - 1) * limit

    const qb = this.opLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.operator', 'operator')
      .orderBy('log.createdAt', 'DESC')

    if (params.operatorId) qb.andWhere('log.operatorId = :opId', { opId: params.operatorId })
    if (params.targetUserId) qb.andWhere('log.targetUserId = :tuid', { tuid: params.targetUserId })
    if (params.action) qb.andWhere('log.action = :action', { action: params.action })
    if (params.startDate) qb.andWhere('log.createdAt >= :start', { start: params.startDate })
    if (params.endDate) qb.andWhere('log.createdAt <= :end', { end: params.endDate })

    qb.skip(skip).take(limit)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, limit }
  }

  /** 获取当前活跃的监控会话列表 */
  async getActiveSessions() {
    return this.sessionRepo.find({
      where: { status: MonitorStatus.ACTIVE },
      relations: ['operator', 'targetUser'],
      order: { updatedAt: 'DESC' },
    })
  }

  // ==================== 私有方法 ====================

  private async writeOpLog(
    operatorId: number,
    action: ChatOpAction,
    targetUserId: number | null,
    peerUserId: number | null,
    content: string | null,
  ) {
    try {
      const log = this.opLogRepo.create({
        operatorId,
        action,
        targetUserId,
        peerUserId,
        content,
      })
      await this.opLogRepo.save(log)
    } catch (e: any) {
      this.logger.warn(`写入操作日志失败: ${e?.message}`)
    }
  }
}
