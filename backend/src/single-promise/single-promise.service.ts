import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, EntityManager } from 'typeorm'
import { SinglePromise } from '../entities/SinglePromise'
import { UserAuth } from '../entities/UserAuth'
import { User } from '../entities/User'
import { RealNameIdentity } from '../entities/RealNameIdentity'

// E证通认证状态常量
const EID_STATUS_DONE = 2

@Injectable()
export class SinglePromiseService {
  constructor(
    @InjectRepository(SinglePromise)
    private readonly spRepo: Repository<SinglePromise>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepo: Repository<UserAuth>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {}

  /** 获取用户当前单身承诺状态 */
  async getStatus(userId: number) {
    const record = await this.spRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    if (!record) {
      return { exists: false }
    }
    return {
      exists: true,
      id: record.id,
      realName: record.realName,
      signatureUrl: record.signatureUrl,
      status: record.status,
      rejectReason: record.rejectReason,
      createdAt: record.createdAt,
    }
  }

  /** 提交/更新单身承诺 */
  async submit(userId: number, signatureUrl: string, inputRealName?: string) {
    // 从实名认证记录中获取真实姓名
    const authRecord = await this.userAuthRepo.findOne({
      where: { userId, authType: 'realname' },
      order: { createdAt: 'DESC' },
    })

    // 检查是否已完成实名认证（UserAuth记录 或 E证通状态）
    let realName = ''
    if (authRecord) {
      const authData = authRecord.authData || {}
      realName = authData.realName || authData.name || ''
    } else {
      // 兼容历史数据：检查 E证通认证状态
      const user = await this.userRepo.findOne({ where: { id: userId } })
      if (!user || user.eidCertStatus !== EID_STATUS_DONE) {
        throw new ForbiddenException('请先完成实名认证')
      }
      // 使用前端传来的姓名作为兜底
      realName = inputRealName?.trim() || ''
    }

    // 若仍未获取到姓名，查询 real_name_identities 新表作为兜底
    if (!realName) {
      const identityRecord = await this.entityManager
        .createQueryBuilder(RealNameIdentity, 'rni')
        .select('rni.realName')
        .where('rni.userId = :userId', { userId })
        .orderBy('rni.createdAt', 'DESC')
        .getOne()
      if (identityRecord?.realName) {
        realName = identityRecord.realName
      }
    }

    if (!realName) {
      throw new ForbiddenException('无法获取实名认证信息，请联系客服')
    }

    let record = await this.spRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (record) {
      // 已有记录，更新签名和状态
      record.realName = realName
      record.signatureUrl = signatureUrl
      record.status = 0 // 重置为待审核
      record.rejectReason = null
      record.auditTime = null
      record.auditedBy = null
      await this.spRepo.save(record)
    } else {
      // 新建记录
      record = this.spRepo.create({
        userId,
        realName,
        signatureUrl,
        status: 0,
      })
      await this.spRepo.save(record)
    }

    return { id: record.id, status: record.status }
  }

  /** 管理后台：分页查询 */
  async adminList(params: {
    page?: number | string
    pageSize?: number | string
    status?: any
  }) {
    const page = Math.max(1, parseInt(String(params.page || 1), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(params.pageSize || 15), 10) || 15))
    const statusRaw = params.status !== undefined && params.status !== null && params.status !== ''
      ? parseInt(String(params.status), 10)
      : NaN
    const status = isNaN(statusRaw) ? undefined : statusRaw
    const qb = this.spRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.user', 'user')
      .select([
        'sp.id', 'sp.userId', 'sp.realName', 'sp.signatureUrl',
        'sp.status', 'sp.rejectReason', 'sp.auditTime',
        'sp.createdAt', 'sp.updatedAt',
        'user.id', 'user.nickname',
      ])
      .orderBy('sp.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (status !== undefined && status !== null) {
      qb.andWhere('sp.status = :status', { status })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  /** 管理后台：审核 */
  async audit(
    id: number,
    data: { status: number; rejectReason?: string; adminId?: number },
  ) {
    const record = await this.spRepo.findOne({ where: { id } })
    if (!record) {
      throw new NotFoundException('记录不存在')
    }
    record.status = data.status
    record.rejectReason = data.rejectReason || null
    record.auditedBy = data.adminId || null
    record.auditTime = new Date()
    await this.spRepo.save(record)
    return { id: record.id, status: record.status }
  }

  /** 根据 userId 查找 */
  async findByUserId(userId: number) {
    return this.spRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }
}
