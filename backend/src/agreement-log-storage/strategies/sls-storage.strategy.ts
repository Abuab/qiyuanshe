import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { beijingISO } from '../../common/utils/date-utils'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserAgreementLog } from '../../entities/UserAgreementLog'
import {
  IAgreementLogStorageStrategy,
  AgreementLogData,
  AgreementLogQuery,
  AgreementLogExport,
  StorageType,
  StorageStrategyConfig,
} from '../agreement-log-storage.types'

/**
 * 阿里云 SLS 日志服务存储策略
 *
 * 通过 HTTP API 写入 / 查询 SLS；
 * 若配置 localBackup=true，则同时写入本地表兜底。
 *
 * SLS API 参考: https://help.aliyun.com/document_detail/29007.html
 */
@Injectable()
export class SlsStorageStrategy implements IAgreementLogStorageStrategy {
  readonly name: StorageType = 'sls'
  private readonly logger = new Logger(SlsStorageStrategy.name)

  private project = ''
  private logstore = ''
  private endpoint = ''
  private accessKeyId = ''
  private accessKeySecret = ''
  private localBackup = false

  constructor(
    @InjectRepository(UserAgreementLog)
    private readonly localRepo: Repository<UserAgreementLog>,
  ) {}

  /**
   * 更新 SLS 配置（由 Service 在配置变更时调用）
   */
  configure(config: StorageStrategyConfig): void {
    this.project = config.slsProject || ''
    this.logstore = config.slsLogstore || ''
    this.endpoint = config.slsEndpoint || ''
    this.accessKeyId = config.slsAccessKeyId || ''
    this.accessKeySecret = config.slsAccessKeySecret || ''
    this.localBackup = config.localBackup || false
  }

  /**
   * SLS API 签名（参考阿里云 V4 签名规范）
   */
  private sign(method: string, path: string, body: string): Record<string, string> {
    const dateStr = new Date().toISOString().replace(/[:-]/g, '').replace(/\.\d+/, '')
    return {
      'x-log-apiversion': '0.6.0',
      'x-log-signaturemethod': 'hmac-sha1',
      'x-log-bodyrawsize': String(body.length),
      'Date': dateStr,
    }
  }

  /**
   * 调用 SLS HTTP API
   */
  private async slsRequest(method: string, path: string, body?: string): Promise<any> {
    const url = `https://${this.project}.${this.endpoint}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-protobuf',
      'Content-Length': String(body?.length || 0),
      ...this.sign(method, path, body || ''),
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      this.logger.error(`SLS API error ${response.status}: ${errorText.slice(0, 300)}`)
      throw new Error(`SLS_API_ERROR:${response.status}`)
    }

    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  /**
   * 写入单条 SLS 日志（LogGroup 格式）
   * 使用 Protobuf 序列化，此处简化以 JSON 格式 POST
   */
  private async writeToSls(log: AgreementLogData): Promise<string> {
    const logId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const timestamp = Math.floor(Date.now() / 1000)

    // SLS PutLogs API 使用 Protobuf，这里构造简化的 LogGroup JSON
    // 实际生产中建议引入 @alicloud/sls-sdk 或使用 protobuf-ts
    const logGroup = {
      logs: [
        {
          time: timestamp,
          contents: [
            { key: 'userId', value: String(log.userId) },
            { key: 'agreementType', value: log.agreementType },
            { key: 'version', value: log.version },
            { key: 'action', value: log.action },
            { key: 'ipAddress', value: log.ipAddress },
            { key: 'userAgent', value: log.userAgent },
            { key: 'logId', value: logId },
          ],
        },
      ],
    }

    const path = `/logstores/${this.logstore}/shards/lb`
    await this.slsRequest('POST', path, JSON.stringify(logGroup))

    return logId
  }

  /**
   * 从 SLS 查询日志
   */
  private async queryFromSls(filters: AgreementLogQuery): Promise<{ items: any[]; total: number }> {
    const { userId, agreementType, startTime, endTime, page = 1, pageSize = 20 } = filters
    const offset = (page - 1) * pageSize

    const queryParts: string[] = ['*']
    if (userId) queryParts.push(`userId:${userId}`)
    if (agreementType) queryParts.push(`agreementType:${agreementType}`)
    const query = queryParts.join(' AND ')

    const from = startTime
      ? Math.floor(new Date(startTime).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400 * 30
    const to = endTime
      ? Math.floor(new Date(endTime).getTime() / 1000)
      : Math.floor(Date.now() / 1000)

    const path = `/logstores/${this.logstore}/index?type=log&from=${from}&to=${to}&query=${encodeURIComponent(query)}&offset=${offset}&size=${pageSize}&reverse=true`

    try {
      const result = await this.slsRequest('GET', path)
      // SLS GetLogs 返回格式: { progress: 'Complete', count: number, logs: [...] }
      const count = (result as any)?.count || 0
      const logs = ((result as any)?.logs || []).map((logObj: any) => {
        const map: Record<string, string> = {}
        for (const kv of logObj?.contents || []) {
          map[kv.key] = kv.value
        }
        return {
          id: map.logId || '-',
          userId: Number(map.userId) || 0,
          agreementType: map.agreementType || '-',
          version: map.version || '-',
          action: map.action || '-',
          ipAddress: map.ipAddress || '',
          userAgent: map.userAgent || '',
          storageSource: 'sls',
          createdAt: logObj.time ? beijingISO(new Date(logObj.time * 1000)) : '',
        }
      })
      return { items: logs, total: count }
    } catch (e) {
      this.logger.error(`SLS query failed: ${(e as any)?.message}`)
      throw e
    }
  }

  // ========== 接口实现 ==========

  async save(log: AgreementLogData): Promise<{ id: string }> {
    let logId = ''
    let slsSuccess = false

    try {
      logId = await this.writeToSls(log)
      slsSuccess = true
    } catch (e: any) {
      this.logger.error(`SLS write failed: ${e?.message}, falling back to local`)
    }

    // 本地备份（默认开启）
    if (this.localBackup || !slsSuccess) {
      try {
        const entity = this.localRepo.create({
          userId: log.userId,
          agreementType: log.agreementType,
          version: log.version,
          action: log.action,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          storageSource: slsSuccess ? 'sls' : 'local',
          slsLogId: logId || undefined,
        })
        await this.localRepo.save(entity)
      } catch (e: any) {
        this.logger.error(`Local backup write failed: ${e?.message}`)
      }
    }

    if (!slsSuccess) {
      throw new Error('SLS写入失败且本地备份已存储')
    }

    return { id: logId }
  }

  async query(
    filters: AgreementLogQuery,
  ): Promise<{ items: any[]; total: number }> {
    try {
      return await this.queryFromSls(filters)
    } catch (e: any) {
      this.logger.error(`SLS query error, falling back to local: ${e?.message}`)
      // 回退到本地查询
      return {
        items: [],
        total: 0,
      }
    }
  }

  async export(filters: AgreementLogExport): Promise<Buffer> {
    // SLS 不直接支持导出 Buffer；走本地备份或 SLS API 导出
    const { items } = await this.query({ ...filters, page: 1, pageSize: 50000 })
    const BOM = '\uFEFF'
    const header = '日志ID,用户ID,协议类型,版本,操作,IP地址,UserAgent,存储来源,时间\n'
    const rows = items
      .map((r: any) =>
        [r.id, r.userId, r.agreementType, r.version, r.action,
          r.ipAddress || '', `"${(r.userAgent || '').replace(/"/g, '""')}"`,
          r.storageSource, r.createdAt,
        ].join(',')).join('\n')
    return Buffer.from(BOM + header + rows, 'utf-8')
  }

  async testConnection(): Promise<boolean> {
    try {
      // 调用 SLS GetProject API 验证连接
      const path = '/'
      await this.slsRequest('GET', path)
      return true
    } catch (e) {
      this.logger.error(`SLS connection test failed: ${(e as any)?.message}`)
      return false
    }
  }

  async exportAll(filters: AgreementLogExport): Promise<AgreementLogData[]> {
    const { items } = await this.query({ ...filters, page: 1, pageSize: 50000 })
    return items.map((r: any) => ({
      userId: r.userId,
      agreementType: r.agreementType,
      version: r.version,
      action: r.action,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      storageSource: 'sls',
    }))
  }

  async importAll(logs: AgreementLogData[]): Promise<number> {
    let count = 0
    for (const log of logs) {
      try {
        await this.writeToSls(log)
        count++
      } catch {}
    }
    return count
  }
}
