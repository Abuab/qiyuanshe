import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { User } from '../entities/User'
import { CrmFollowRecord } from '../entities/CrmFollowRecord'
import { AdminUser } from '../entities/AdminUser'
import { AdminRole, CrmStage } from '../shared/enums'

export interface CrmCustomerFilter {
  page?: number
  limit?: number
  keyword?: string
  stage?: number | string
  ownerId?: number | string
}

/** 可被分配为负责人的后台角色 */
const ASSIGNABLE_ROLES = [AdminRole.SUPER_ADMIN, AdminRole.MATCHMAKER, AdminRole.OPERATOR]

@Injectable()
export class AdminCrmService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CrmFollowRecord) private readonly followRepo: Repository<CrmFollowRecord>,
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
  ) {}

  /** 客户列表（含负责人姓名），支持阶段/负责人/关键词筛选 */
  async listCustomers(filter: CrmCustomerFilter) {
    const page = filter.page || 1
    const limit = filter.limit || 20

    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.isDeleted = 0')

    if (filter.keyword) {
      const kw = `%${filter.keyword}%`
      qb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw OR u.userId LIKE :kw)', { kw })
    }
    if (filter.stage !== undefined && filter.stage !== null && filter.stage !== '') {
      qb.andWhere('u.crmStage = :stage', { stage: Number(filter.stage) })
    }
    if (filter.ownerId !== undefined && filter.ownerId !== null && filter.ownerId !== '') {
      qb.andWhere('u.crmOwnerId = :ownerId', { ownerId: Number(filter.ownerId) })
    }

    const [list, total] = await qb
      .orderBy('u.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    const ownerMap = await this.buildOwnerNameMap(list)

    return {
      list: list.map((u) => ({
        id: u.id,
        userId: u.userId,
        nickname: u.nickname,
        avatar: u.avatar,
        gender: u.gender,
        phone: u.phone,
        isVip: u.isVip,
        status: u.status,
        crmStage: u.crmStage ?? CrmStage.NEW,
        crmOwnerId: u.crmOwnerId ?? null,
        ownerName: u.crmOwnerId ? (ownerMap.get(u.crmOwnerId) || '') : '',
        createdAt: u.createdAt,
      })),
      page,
      limit,
      total,
    }
  }

  /** 销售漏斗：各阶段客户数量 + 未分配数量 */
  async funnel() {
    const rows = await this.userRepo.createQueryBuilder('u')
      .select('u.crmStage', 'stage')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.isDeleted = 0')
      .groupBy('u.crmStage')
      .getRawMany()

    const stageCounts: Record<number, number> = {}
    let total = 0
    for (const r of rows) {
      const stage = Number(r.stage)
      const cnt = Number(r.cnt)
      stageCounts[stage] = cnt
      total += cnt
    }

    const unassigned = await this.userRepo.count({
      where: { isDeleted: 0, crmOwnerId: null },
    })

    return {
      total,
      unassigned,
      stageCounts,
      stages: Object.values(CrmStage).filter((v) => typeof v === 'number').map((v) => ({
        value: v as number,
        label: CRM_STAGE_LABELS[v as number] || String(v),
        count: stageCounts[v as number] || 0,
      })),
    }
  }

  /** 可分配的负责人列表 */
  async listAssignableAdmins() {
    const admins = await this.adminRepo.find({
      where: { status: 1, role: In(ASSIGNABLE_ROLES as AdminRole[]) },
      order: { id: 'ASC' },
    })
    return admins.map((a) => ({ id: a.id, nickname: a.nickname || a.username, role: a.role }))
  }

  /** 线索分配：批量设置客户负责人 */
  async assign(userIds: number[], ownerId: number) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('请选择要分配的客户')
    }
    if (!ownerId) {
      throw new BadRequestException('请选择负责人')
    }
    const owner = await this.adminRepo.findOne({ where: { id: ownerId, status: 1 } })
    if (!owner) {
      throw new BadRequestException('负责人不存在或已禁用')
    }
    const res = await this.userRepo.update({ id: In(userIds), isDeleted: 0 }, { crmOwnerId: ownerId })
    return { updated: res.affected || 0 }
  }

  /** 某客户的跟进记录列表（含跟进人姓名） */
  async listFollowRecords(userId: number) {
    const records = await this.followRepo.find({
      where: { userId },
      order: { id: 'DESC' },
      take: 100,
    })
    const adminIds = [...new Set(records.map((r) => r.adminUserId))]
    const admins = adminIds.length
      ? await this.adminRepo.find({ where: { id: In(adminIds) } })
      : []
    const nameMap = new Map(admins.map((a) => [a.id, a.nickname || a.username]))
    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      adminUserId: r.adminUserId,
      adminName: nameMap.get(r.adminUserId) || '',
      content: r.content,
      nextFollowAt: r.nextFollowAt,
      createdAt: r.createdAt,
    }))
  }

  /** 新增跟进记录（可选同时更新客户阶段） */
  async createFollowRecord(
    adminUserId: number,
    data: { userId: number; content: string; nextFollowAt?: string; stage?: number },
  ) {
    if (!data.userId) throw new BadRequestException('缺少客户')
    if (!data.content || !data.content.trim()) throw new BadRequestException('跟进内容不能为空')

    const user = await this.userRepo.findOne({ where: { id: data.userId, isDeleted: 0 } })
    if (!user) throw new BadRequestException('客户不存在')

    const record = this.followRepo.create({
      userId: data.userId,
      adminUserId,
      content: data.content.trim(),
      nextFollowAt: data.nextFollowAt ? new Date(data.nextFollowAt) : null,
    })
    const saved = await this.followRepo.save(record)

    if (data.stage !== undefined && data.stage !== null) {
      await this.userRepo.update(data.userId, { crmStage: Number(data.stage) })
    }

    return saved
  }

  /** 红娘工作台：我的客户统计 + 待跟进列表 */
  async workspace(adminUserId: number) {
    const myCustomerCount = await this.userRepo.count({
      where: { isDeleted: 0, crmOwnerId: adminUserId },
    })

    // 各阶段数量（我的客户）
    const stageRows = await this.userRepo.createQueryBuilder('u')
      .select('u.crmStage', 'stage')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.isDeleted = 0 AND u.crmOwnerId = :ownerId', { ownerId: adminUserId })
      .groupBy('u.crmStage')
      .getRawMany()
    const stageCounts: Record<number, number> = {}
    for (const r of stageRows) stageCounts[Number(r.stage)] = Number(r.cnt)

    // 待跟进：我的客户中，最近一条跟进记录设了 nextFollowAt 且已到期（或未来提醒）
    const dueFollowUps = await this.queryDueFollowUps(adminUserId)

    return {
      myCustomerCount,
      stageCounts,
      dueFollowUpCount: dueFollowUps.length,
      dueFollowUps,
    }
  }

  /** 查询当前负责人名下、有待跟进提醒的客户（取最近一次 nextFollowAt） */
  private async queryDueFollowUps(adminUserId: number) {
    const raw: any[] = await this.followRepo.query(
      `SELECT f.userId AS userId, f.nextFollowAt AS nextFollowAt, f.content AS content, f.createdAt AS createdAt
       FROM crm_follow_records f
       JOIN (
         SELECT userId, MAX(id) AS maxId
         FROM crm_follow_records
         GROUP BY userId
       ) latest ON latest.maxId = f.id
       JOIN users u ON u.id = f.userId
       WHERE u.isDeleted = 0 AND u.crmOwnerId = ? AND f.nextFollowAt IS NOT NULL
       ORDER BY f.nextFollowAt ASC
       LIMIT 100`,
      [adminUserId],
    )
    // 附加客户昵称
    const userIds = raw.map((r) => Number(r.userId))
    const users = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) } }) : []
    const userMap = new Map(users.map((u) => [Number(u.id), u]))
    return raw
      .filter((r) => r.nextFollowAt !== null && r.nextFollowAt !== undefined)
      .map((r) => {
        const u = userMap.get(Number(r.userId))
        return {
          userId: Number(r.userId),
          nickname: u?.nickname || '',
          avatar: u?.avatar || '',
          phone: u?.phone || '',
          nextFollowAt: r.nextFollowAt,
          lastContent: r.content || '',
          lastFollowAt: r.createdAt,
        }
      })
  }

  /** 构建 crmOwnerId -> 负责人姓名 映射 */
  private async buildOwnerNameMap(users: User[]): Promise<Map<number, string>> {
    const ownerIds = [...new Set(users.filter((u) => u.crmOwnerId).map((u) => u.crmOwnerId as number))]
    if (!ownerIds.length) return new Map()
    const admins = await this.adminRepo.find({ where: { id: In(ownerIds) } })
    return new Map(admins.map((a) => [a.id, a.nickname || a.username]))
  }
}

/** 客户阶段中文标签 */
export const CRM_STAGE_LABELS: Record<number, string> = {
  [CrmStage.NEW]: '新注册',
  [CrmStage.CONTACTED]: '初步接触',
  [CrmStage.FOLLOWING]: '深度跟进',
  [CrmStage.PAID]: '已付费',
  [CrmStage.SUCCESS]: '脱单成功',
  [CrmStage.LOST]: '流失',
}
