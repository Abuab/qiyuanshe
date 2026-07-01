import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SinglePromise } from '../entities/SinglePromise'

@Injectable()
export class SinglePromiseService {
  constructor(
    @InjectRepository(SinglePromise)
    private readonly spRepo: Repository<SinglePromise>,
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
  async submit(userId: number, realName: string, signatureUrl: string) {
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
    page: number
    pageSize: number
    status?: number
  }) {
    const { page, pageSize, status } = params
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
