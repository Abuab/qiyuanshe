import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { AgreementLogStorageConfig } from '../entities/AgreementLogStorageConfig'
import { User } from '../entities/User'
import { StorageStrategyFactory } from './strategies/storage-strategy.factory'
import { SlsStorageStrategy } from './strategies/sls-storage.strategy'
import {
  StorageType,
  StorageStrategyConfig,
  AgreementLogData,
  AgreementLogQuery,
  AgreementLogExport,
  IAgreementLogStorageStrategy,
} from './agreement-log-storage.types'

/**
 * AES 简单加解密（生产环境建议使用更安全的密钥管理方案）
 */
const AES_KEY = process.env.SLS_STORAGE_ENCRYPTION_KEY || 'qiyuanshe-match-sls-key-2024!!'

function encryptAes(plain: string): string {
  try {
    const crypto = require('crypto')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_KEY.padEnd(32, '0').slice(0, 32)), iv)
    let encrypted = cipher.update(plain, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch {
    return Buffer.from(plain).toString('base64')
  }
}

function decryptAes(encrypted: string): string {
  try {
    const crypto = require('crypto')
    const [ivHex, encData] = encrypted.split(':')
    if (!ivHex || !encData) return Buffer.from(encrypted, 'base64').toString('utf8')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(AES_KEY.padEnd(32, '0').slice(0, 32)), Buffer.from(ivHex, 'hex'))
    let decrypted = decipher.update(encData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return Buffer.from(encrypted, 'base64').toString('utf8')
  }
}

/**
 * 协议同意记录存储 Service
 * - 管理存储配置（读取/更新 storage_config 表）
 * - 自动路由写入/查询到对应策略
 * - 配置切换时同步更新 SLS 策略参数
 */
@Injectable()
export class AgreementLogStorageService {
  private readonly logger = new Logger(AgreementLogStorageService.name)
  private currentConfig: StorageStrategyConfig = {
    storageType: 'local',
    localBackup: true,
    slsProject: '',
    slsLogstore: '',
    slsEndpoint: '',
    slsAccessKeyId: '',
    slsAccessKeySecret: '',
  }

  constructor(
    @InjectRepository(AgreementLogStorageConfig)
    private readonly configRepo: Repository<AgreementLogStorageConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly factory: StorageStrategyFactory,
    private readonly slsStrategy: SlsStorageStrategy,
  ) {}

  /**
   * 启动时从 DB 加载配置并初始化策略
   */
  async onModuleInit(): Promise<void> {
    await this.loadConfig()
  }

  /**
   * 从 DB 加载配置（读取 storage_config 表）
   */
  async loadConfig(): Promise<StorageStrategyConfig> {
    const configs = await this.configRepo.find()
    const map = new Map<string, string>()
    configs.forEach((c) => map.set(c.configKey, c.configValue || ''))

    const storageType = (map.get('agreement_log_storage') || 'local') as StorageType
    const localBackup = map.get('agreement_log_local_backup') !== 'false'

    this.currentConfig = {
      storageType,
      localBackup,
      slsProject: map.get('agreement_log_sls_project') || '',
      slsLogstore: map.get('agreement_log_sls_logstore') || '',
      slsEndpoint: map.get('agreement_log_sls_endpoint') || '',
      slsAccessKeyId: map.get('agreement_log_sls_access_key_id') || '',
      slsAccessKeySecret: map.get('agreement_log_sls_access_key_secret')
        ? decryptAes(map.get('agreement_log_sls_access_key_secret')!)
        : '',
    }

    // 切换策略
    this.factory.switchTo(storageType)

    // SLS 策略配置
    if (storageType === 'sls') {
      this.slsStrategy.configure(this.currentConfig)
    }

    this.logger.log(`Config loaded: storageType=${storageType}, localBackup=${localBackup}`)
    return this.currentConfig
  }

  /**
   * 更新存储配置
   */
  async updateConfig(config: Partial<StorageStrategyConfig>): Promise<StorageStrategyConfig> {
    const updates: Array<{ key: string; value: string | null }> = []

    if (config.storageType !== undefined) {
      updates.push({
        key: 'agreement_log_storage',
        value: config.storageType,
      })
      this.currentConfig.storageType = config.storageType
    }
    if (config.localBackup !== undefined) {
      updates.push({
        key: 'agreement_log_local_backup',
        value: String(config.localBackup),
      })
      this.currentConfig.localBackup = config.localBackup
    }
    if (config.slsProject !== undefined) {
      updates.push({
        key: 'agreement_log_sls_project',
        value: config.slsProject,
      })
      this.currentConfig.slsProject = config.slsProject
    }
    if (config.slsLogstore !== undefined) {
      updates.push({
        key: 'agreement_log_sls_logstore',
        value: config.slsLogstore,
      })
      this.currentConfig.slsLogstore = config.slsLogstore
    }
    if (config.slsEndpoint !== undefined) {
      updates.push({
        key: 'agreement_log_sls_endpoint',
        value: config.slsEndpoint,
      })
      this.currentConfig.slsEndpoint = config.slsEndpoint
    }
    if (config.slsAccessKeyId !== undefined) {
      updates.push({
        key: 'agreement_log_sls_access_key_id',
        value: config.slsAccessKeyId,
      })
      this.currentConfig.slsAccessKeyId = config.slsAccessKeyId
    }
    if (config.slsAccessKeySecret !== undefined) {
      const encrypted = encryptAes(config.slsAccessKeySecret)
      updates.push({
        key: 'agreement_log_sls_access_key_secret',
        value: encrypted,
      })
      this.currentConfig.slsAccessKeySecret = config.slsAccessKeySecret
    }

    // 批量 upsert
    for (const { key, value } of updates) {
      let entity = await this.configRepo.findOne({ where: { configKey: key } })
      if (entity) {
        entity.configValue = value
      } else {
        entity = this.configRepo.create({
          configKey: key,
          configValue: value,
          description: `协议日志存储配置: ${key}`,
        })
      }
      await this.configRepo.save(entity)
    }

    // 策略生效 + SLS 重配置
    this.factory.switchTo(this.currentConfig.storageType)
    if (this.currentConfig.storageType === 'sls') {
      this.slsStrategy.configure(this.currentConfig)
    }

    this.logger.log(`Config updated: storageType=${this.currentConfig.storageType}`)
    return this.getConfigForAdmin()
  }

  /**
   * 获取配置（管理后台用，脱敏 Secret）
   */
  getConfigForAdmin(): StorageStrategyConfig & { slsAccessKeySecretMasked: string } {
    const masked = this.currentConfig.slsAccessKeySecret
      ? this.currentConfig.slsAccessKeySecret.slice(0, 4) + '****' + this.currentConfig.slsAccessKeySecret.slice(-4)
      : ''
    return {
      ...this.currentConfig,
      slsAccessKeySecretMasked: masked,
      slsAccessKeySecret: '', // 不返回明文
    }
  }

  /**
   * 获取当前策略
   */
  private getActiveStrategy(): IAgreementLogStorageStrategy {
    return this.factory.getStrategy()
  }

  /** 保存同意记录 */
  async saveLog(data: {
    userId: number
    agreementType: string
    version: string
    action: string
    ipAddress: string
    userAgent: string
  }): Promise<{ id: string }> {
    const logData: AgreementLogData = {
      ...data,
      storageSource: this.factory.getActiveType(),
    }
    return this.getActiveStrategy().save(logData)
  }

  /** 查询日志（附带用户昵称和手机号） */
  async queryLogs(
    filters: AgreementLogQuery,
  ): Promise<{ items: any[]; total: number }> {
    const result = await this.getActiveStrategy().query(filters)

    // 批量查询用户昵称和手机号
    const userIds = [...new Set(result.items.map((item: any) => item.userId).filter(Boolean))] as number[]
    if (userIds.length > 0) {
      const users = await this.userRepo.find({
        where: { id: In(userIds) },
        select: ['id', 'nickname', 'phone'],
      })
      const userMap = new Map(users.map(u => [u.id, u]))
      result.items = result.items.map((item: any) => {
        const u = userMap.get(item.userId)
        return {
          ...item,
          nickname: u?.nickname || '',
          phone: u?.phone || '',
        }
      })
    }

    return result
  }

  /** 导出 CSV */
  async exportLogs(filters: AgreementLogExport): Promise<Buffer> {
    return this.getActiveStrategy().export(filters)
  }

  /** 测试 SLS 连接（传入临时配置，不持久化） */
  async testSlsConnection(config: {
    slsProject: string
    slsLogstore: string
    slsEndpoint: string
    slsAccessKeyId: string
    slsAccessKeySecret: string
  }): Promise<boolean> {
    // 临时配置 SLS 策略
    this.slsStrategy.configure({
      storageType: 'sls',
      localBackup: false,
      slsProject: config.slsProject,
      slsLogstore: config.slsLogstore,
      slsEndpoint: config.slsEndpoint,
      slsAccessKeyId: config.slsAccessKeyId,
      slsAccessKeySecret: config.slsAccessKeySecret,
    })
    const ok = await this.slsStrategy.testConnection()
    // 恢复当前配置
    if (this.currentConfig.storageType === 'sls') {
      this.slsStrategy.configure(this.currentConfig)
    }
    return ok
  }

  /** 跨策略迁移数据 */
  async migrate(from: StorageType, to: StorageType): Promise<{ migrated: number }> {
    const strategies = this.factory.getBothStrategies()
    const fromStrategy = from === 'sls' ? strategies.sls : strategies.local
    const toStrategy = to === 'sls' ? strategies.sls : strategies.local

    const data = await fromStrategy.exportAll({})
    const count = await toStrategy.importAll(data)
    this.logger.log(`Migrated ${count} records from ${from} to ${to}`)
    return { migrated: count }
  }
}
