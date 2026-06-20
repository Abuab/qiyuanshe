import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, FindOptionsWhere } from 'typeorm'
import { UserAgreementLog } from '../../entities/UserAgreementLog'
import {
  IAgreementLogStorageStrategy,
  AgreementLogData,
  AgreementLogQuery,
  AgreementLogExport,
  StorageType,
} from '../agreement-log-storage.types'

/**
 * 本地 MySQL 存储策略
 */
@Injectable()
export class LocalStorageStrategy implements IAgreementLogStorageStrategy {
  readonly name: StorageType = 'local'
  private readonly logger = new Logger(LocalStorageStrategy.name)

  constructor(
    @InjectRepository(UserAgreementLog)
    private readonly repo: Repository<UserAgreementLog>,
  ) {}

  async save(log: AgreementLogData): Promise<{ id: string }> {
    const entity = this.repo.create({
      userId: log.userId,
      agreementType: log.agreementType,
      version: log.version,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      storageSource: 'local',
    })
    const saved = await this.repo.save(entity)
    return { id: String(saved.id) }
  }

  async query(
    filters: AgreementLogQuery,
  ): Promise<{ items: any[]; total: number }> {
    const page = Math.max(1, filters.page || 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20))

    const where: FindOptionsWhere<UserAgreementLog> = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.agreementType) where.agreementType = filters.agreementType

    if (filters.startTime || filters.endTime) {
      const start = filters.startTime
        ? new Date(filters.startTime)
        : new Date('2000-01-01')
      const end = filters.endTime ? new Date(filters.endTime) : new Date()
      ;(where as any).createdAt = Between(start, end)
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return { items, total }
  }

  async export(filters: AgreementLogExport): Promise<Buffer> {
    const where: FindOptionsWhere<UserAgreementLog> = {}
    if (filters.userId) where.userId = filters.userId
    if (filters.startTime || filters.endTime) {
      const start = filters.startTime
        ? new Date(filters.startTime)
        : new Date('2000-01-01')
      const end = filters.endTime ? new Date(filters.endTime) : new Date()
      ;(where as any).createdAt = Between(start, end)
    }

    const items = await this.repo.find({ where, order: { createdAt: 'DESC' }, take: 50000 })

    const BOM = '\uFEFF'
    const header = 'ID,用户ID,协议类型,版本,操作,IP地址,UserAgent,存储来源,时间\n'
    const rows = items
      .map((r) =>
        [
          r.id, r.userId, r.agreementType, r.version, r.action,
          r.ipAddress || '', `"${(r.userAgent || '').replace(/"/g, '""')}"`,
          r.storageSource, r.createdAt?.toISOString() || '',
        ].join(','),
      )
      .join('\n')
    return Buffer.from(BOM + header + rows, 'utf-8')
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.repo.query('SELECT 1')
      return true
    } catch (e) {
      this.logger.error(`Local DB connection test failed: ${(e as any)?.message}`)
      return false
    }
  }

  async exportAll(filters: AgreementLogExport): Promise<AgreementLogData[]> {
    const where: FindOptionsWhere<UserAgreementLog> = {}
    if (filters.userId) where.userId = filters.userId
    if (filters.startTime || filters.endTime) {
      const start = filters.startTime
        ? new Date(filters.startTime)
        : new Date('2000-01-01')
      const end = filters.endTime ? new Date(filters.endTime) : new Date()
      ;(where as any).createdAt = Between(start, end)
    }
    const items = await this.repo.find({ where, take: 50000 })
    return items.map((r) => ({
      userId: r.userId,
      agreementType: r.agreementType,
      version: r.version,
      action: r.action,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      storageSource: 'local' as any,
    }))
  }

  async importAll(logs: AgreementLogData[]): Promise<number> {
    if (logs.length === 0) return 0
    const entities = logs.map((log) =>
      this.repo.create({
        userId: log.userId,
        agreementType: log.agreementType,
        version: log.version,
        action: log.action,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        storageSource: log.storageSource,
      }),
    )
    await this.repo.save(entities, { chunk: 200 })
    return entities.length
  }
}
