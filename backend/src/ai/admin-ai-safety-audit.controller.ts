import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { ContentSafetyAudit, SafetyAuditResult, BlockReasonType } from '../entities/ContentSafetyAudit'
import { User } from '../entities/User'
import { Result } from '../common/result'
import { AdminRole } from '../shared/enums'

/**
 * 管理后台 - AI 内容安全审核接口
 */
@Controller('admin/ai/safety-audits')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.OPERATOR)
export class AdminAiSafetyAuditController {
  constructor(
    @InjectRepository(ContentSafetyAudit)
    private readonly auditRepo: Repository<ContentSafetyAudit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 获取安全审核列表（支持分页和筛选） */
  @Get()
  async getList(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('callType') callType?: string,
    @Query('auditResult') auditResult?: string,
    @Query('level') level?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const qb = this.auditRepo.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.aiCallLog', 'callLog')
      .orderBy('audit.id', 'DESC')

    if (callType) qb.andWhere('callLog.callType = :callType', { callType })
    if (auditResult) qb.andWhere('audit.result = :auditResult', { auditResult: decodeAuditResult(auditResult) })
    if (level) qb.andWhere('audit.detail LIKE :levelPattern', { levelPattern: `%${level}级%` })
    if (userId) {
      // 筛选框输入的是对外展示的公开 userId，先转换为内部主键 id
      const u = await this.userRepo.findOne({ where: { userId: String(userId) }, select: ['id'] })
      qb.andWhere('callLog.userId = :uid', { uid: u ? u.id : -1 })
    }
    if (startDate) qb.andWhere('audit.createdAt >= :startDate', { startDate })
    if (endDate) qb.andWhere('audit.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' })

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    // 批量查询用户公开 userId 和昵称
    const internalIds = [...new Set(items.map((it) => (it as any).aiCallLog?.userId).filter(Boolean))] as number[]
    const userMap = new Map<number, User>()
    if (internalIds.length > 0) {
      const users = await this.userRepo.find({ where: { id: In(internalIds) }, select: ['id', 'userId', 'nickname'] })
      users.forEach((u) => userMap.set(u.id, u))
    }

    const mapped = items.map((item) => {
      const log: any = (item as any).aiCallLog || {}
      const u = userMap.get(log.userId)
      let hitWords: string[] = []
      try { hitWords = item.hitWords ? JSON.parse(item.hitWords) : [] } catch { /* ignore */ }
      let safetyLevel = 0
      if (item.detail) {
        const m = item.detail.match(/(\d)级/)
        if (m) safetyLevel = parseInt(m[1])
      }
      return {
        id: item.id,
        userId: u?.userId || '',
        userNickname: u?.nickname || '',
        callType: log.callType || '',
        content: item.originalContent || '',
        sensitiveWords: hitWords,
        safetyLevel,
        auditResult: reverseAuditResult(item.result),
        createdAt: item.createdAt?.toISOString() || '',
      }
    })

    return Result.success({ items: mapped, total, page, limit })
  }

  /** 获取审核统计 */
  @Get('stats')
  async getStats() {
    const [pending, approved, blocked, flagged] = await Promise.all([
      this.auditRepo.count({ where: { result: SafetyAuditResult.PASS } }), // 默认新建即为 pass 已展示
      this.auditRepo.count({ where: { result: SafetyAuditResult.PASS } }),
      this.auditRepo.count({ where: { result: SafetyAuditResult.BLOCK } }),
      this.auditRepo.count({ where: { result: SafetyAuditResult.MANUAL_REVIEW } }),
    ])

    return Result.success({ pending: 0, approved, blocked, flagged })
  }

  /** 更新单条审核状态 */
  @Put(':id')
  async updateAudit(
    @Param('id') id: number,
    @Body('auditResult') auditResult: string,
  ) {
    const audit = await this.auditRepo.findOne({ where: { id } })
    if (!audit) return Result.notFound('审核记录不存在')

    const mapped = mapAuditResult(auditResult)
    if (!mapped) return Result.badRequest('无效的审核结果')

    audit.result = mapped
    if (auditResult === 'BLOCK' && !audit.blockReason) {
      audit.blockReason = BlockReasonType.OTHER
    }
    await this.auditRepo.save(audit)

    return Result.success(null, '审核状态已更新')
  }

  /** 批量更新审核状态 */
  @Put('batch')
  async batchUpdate(@Body('ids') ids: number[], @Body('auditResult') auditResult: string) {
    if (!ids?.length) return Result.badRequest('请选择审核记录')
    const mapped = mapAuditResult(auditResult)
    if (!mapped) return Result.badRequest('无效的审核结果')

    const updateData: any = { result: mapped }
    if (auditResult === 'BLOCK') updateData.blockReason = BlockReasonType.OTHER
    await this.auditRepo.update(ids, updateData)
    return Result.success(null, `已更新 ${ids.length} 条记录`)
  }

  /** 下架内容（拦截 + 记录原因） */
  @Put(':id/remove')
  async removeContent(
    @Param('id') id: number,
    @Body('reason') reason?: string,
  ) {
    const audit = await this.auditRepo.findOne({ where: { id } })
    if (!audit) return Result.notFound('审核记录不存在')

    audit.result = SafetyAuditResult.BLOCK
    audit.blockReason = BlockReasonType.OTHER
    audit.detail = (audit.detail || '') + `\n下架原因: ${reason || '管理员手动下架'}`
    await this.auditRepo.save(audit)

    return Result.success(null, '内容已下架')
  }
}

// ===== 辅助映射 =====

/** 前端 auditResult → 实体 result 枚举 */
function mapAuditResult(frontend: string): SafetyAuditResult | null {
  const map: Record<string, SafetyAuditResult> = {
    'PASS': SafetyAuditResult.PASS,
    'BLOCK': SafetyAuditResult.BLOCK,
    'MANUAL_REVIEW': SafetyAuditResult.MANUAL_REVIEW,
    'PENDING': SafetyAuditResult.PASS, // 默认通过展示
  }
  return map[frontend] || null
}

/** 实体 result → 前端 auditResult */
function reverseAuditResult(entity: SafetyAuditResult): string {
  const map: Record<string, string> = {
    'pass': 'PASS',
    'block': 'BLOCK',
    'manual_review': 'MANUAL_REVIEW',
  }
  return map[entity] || 'PASS'
}

/** 前端 auditResult → 实体 result 枚举（用于筛选） */
function decodeAuditResult(frontend: string): SafetyAuditResult {
  return mapAuditResult(frontend) || SafetyAuditResult.PASS
}
