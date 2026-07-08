import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserAuth } from '../entities/UserAuth'

const AUTH_TYPE = 'education'

@Injectable()
export class EducationAuthService {
  constructor(
    @InjectRepository(UserAuth)
    private readonly userAuthRepo: Repository<UserAuth>,
  ) {}

  /** 获取当前用户学历认证状态 */
  async getStatus(userId: number) {
    const record = await this.userAuthRepo.findOne({
      where: { userId, authType: AUTH_TYPE },
      order: { createdAt: 'DESC' },
    })
    if (!record) {
      return { exists: false }
    }
    const data = record.authData || {}
    return {
      exists: true,
      id: record.id,
      school: data.school || '',
      degree: data.degree || '',
      image: data.image || '',
      status: record.status,
      rejectReason: record.rejectReason,
      createdAt: record.createdAt,
    }
  }

  /** 提交/更新学历认证 */
  async submit(
    userId: number,
    payload: { school: string; degree: string; image: string },
  ) {
    let record = await this.userAuthRepo.findOne({
      where: { userId, authType: AUTH_TYPE },
      order: { createdAt: 'DESC' },
    })

    const authData = {
      school: payload.school,
      degree: payload.degree,
      image: payload.image,
    }

    if (record) {
      record.authData = authData
      record.status = 0 // 重置为待审核
      record.rejectReason = null
      await this.userAuthRepo.save(record)
    } else {
      record = this.userAuthRepo.create({
        userId,
        authType: AUTH_TYPE,
        authData,
        status: 0,
      })
      await this.userAuthRepo.save(record)
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
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(params.pageSize || 15), 10) || 15),
    )
    const statusRaw =
      params.status !== undefined && params.status !== null && params.status !== ''
        ? parseInt(String(params.status), 10)
        : NaN
    const status = isNaN(statusRaw) ? undefined : statusRaw

    const qb = this.userAuthRepo
      .createQueryBuilder('auth')
      .leftJoinAndSelect('auth.user', 'user')
      .select([
        'auth.id', 'auth.userId', 'auth.authData',
        'auth.status', 'auth.rejectReason', 'auth.createdAt',
        'user.id', 'user.nickname',
      ])
      .where('auth.authType = :authType', { authType: AUTH_TYPE })
      .orderBy('auth.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (status !== undefined) {
      qb.andWhere('auth.status = :status', { status })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  /** 管理后台：审核 */
  async audit(id: number, data: { status: number; rejectReason?: string }) {
    const record = await this.userAuthRepo.findOne({ where: { id } })
    if (!record) {
      throw new NotFoundException('记录不存在')
    }
    record.status = data.status
    record.rejectReason = data.rejectReason || null
    await this.userAuthRepo.save(record)
    return { id: record.id, status: record.status }
  }
}
