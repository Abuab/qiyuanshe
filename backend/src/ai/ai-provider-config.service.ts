import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not } from 'typeorm'
import { RedisService } from '../common/redis.service'
import { AiProviderConfig, LoadBalanceStrategy } from '../entities/AiProviderConfig'
import { encryptApiKey, decryptApiKey, maskApiKey } from './ai-crypto.util'
import {
  ProviderConfigInput,
  ProviderConfigVO,
  AiProviderSnapshot,
  LoadBalanceConfig,
  PROVIDER_LIST_CACHE_KEY,
  PROVIDER_STRATEGY_KEY,
} from './ai-provider.types'

/**
 * AI Provider 配置管理 Service
 *
 * - DB 读写 + Redis 缓存同步
 * - API Key 加密存储 / 脱敏返回
 * - CRUD 操作 + 操作日志
 */
@Injectable()
export class AiProviderConfigService {
  private readonly logger = new Logger(AiProviderConfigService.name)

  /** 全局负载均衡策略（默认加权分配） */
  private currentStrategy: LoadBalanceStrategy = LoadBalanceStrategy.WEIGHTED

  constructor(
    @InjectRepository(AiProviderConfig)
    private readonly configRepo: Repository<AiProviderConfig>,
    private readonly redis: RedisService,
  ) {}

  // ==================== 初始化 ====================

  /** 系统启动时调用：加载所有启用 Provider 到 Redis */
  async syncToRedis(): Promise<void> {
    const configs = await this.configRepo.find({
      where: { isEnabled: 1, isDeleted: 0 },
    })

    const snapshots: AiProviderSnapshot[] = []
    for (const cfg of configs) {
      try {
        snapshots.push({
          id: cfg.id,
          providerKey: cfg.providerKey,
          displayName: cfg.displayName,
          apiBase: cfg.apiBase,
          modelName: cfg.modelName,
          apiKeyPlain: decryptApiKey(cfg.apiKeyEncrypted),
          weight: cfg.weight,
          priority: cfg.priority,
          isEnabled: cfg.isEnabled === 1,
          isDefault: cfg.isDefault === 1,
        })
      } catch (e: any) {
        this.logger.error(`解密 Provider ${cfg.displayName} 的 API Key 失败: ${e?.message}`)
      }
    }

    await this.redis.set(PROVIDER_LIST_CACHE_KEY, JSON.stringify(snapshots), 0)
    this.logger.log(`[Provider] 已同步 ${snapshots.length} 个启用的 Provider 到 Redis`)

    // 设置默认策略
    await this.redis.set(PROVIDER_STRATEGY_KEY, this.currentStrategy, 0)
  }

  // ==================== CRUD ====================

  /** 获取所有 Provider 配置列表（管理后台用，key 脱敏） */
  async getAll(): Promise<ProviderConfigVO[]> {
    const configs = await this.configRepo.find({
      where: { isDeleted: 0 },
      order: { priority: 'ASC' },
    })
    return configs.map(cfg => this.toVO(cfg))
  }

  /** 获取所有启用的 Provider 运行时快照 */
  async getEnabledSnapshots(): Promise<AiProviderSnapshot[]> {
    const cached = await this.redis.get(PROVIDER_LIST_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {}
    }
    await this.syncToRedis()
    const retry = await this.redis.get(PROVIDER_LIST_CACHE_KEY)
    return retry ? JSON.parse(retry) : []
  }

  /** 获取单个 Provider 解密后的 Key */
  async getDecryptedKey(providerId: number): Promise<string> {
    const cfg = await this.configRepo.findOne({ where: { id: providerId, isDeleted: 0 } })
    if (!cfg) throw new BadRequestException('Provider 不存在')
    return decryptApiKey(cfg.apiKeyEncrypted)
  }

  /** 新增 Provider */
  async create(input: ProviderConfigInput, operatorId?: number): Promise<ProviderConfigVO> {
    if (!input.apiKey) throw new BadRequestException('API Key 不能为空')

    const existing = await this.configRepo.findOne({
      where: { providerKey: input.providerKey, isDeleted: 0 },
    })
    if (existing) throw new BadRequestException(`Provider ${input.providerKey} 已存在`)

    const encrypted = encryptApiKey(input.apiKey)
    const cfg = this.configRepo.create({
      providerKey: input.providerKey,
      displayName: input.displayName,
      apiKeyEncrypted: encrypted,
      apiBase: input.apiBase,
      modelName: input.modelName,
      isEnabled: input.isEnabled ? 1 : 0,
      isDefault: input.isDefault ? 1 : 0,
      weight: input.weight || 10,
      priority: input.priority || 100,
      balanceQueryUrl: input.balanceQueryUrl || null,
    })
    const saved = await this.configRepo.save(cfg)

    // 如果设为默认，取消其他默认
    if (input.isDefault) {
      await this.configRepo.update(
        { id: Not(saved.id), isDeleted: 0 },
        { isDefault: 0 },
      )
    }

    this.logger.log(`[Provider] ${operatorId ? `管理员${operatorId}` : '系统'} 新增 Provider: ${input.providerKey}`)
    await this.syncToRedis()
    return this.toVO(saved)
  }

  /** 编辑 Provider */
  async update(id: number, input: Partial<ProviderConfigInput>, operatorId?: number): Promise<ProviderConfigVO> {
    const cfg = await this.configRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!cfg) throw new BadRequestException('Provider 不存在')

    if (input.providerKey !== undefined) cfg.providerKey = input.providerKey
    if (input.displayName !== undefined) cfg.displayName = input.displayName
    if (input.apiKey) cfg.apiKeyEncrypted = encryptApiKey(input.apiKey)
    if (input.apiBase !== undefined) cfg.apiBase = input.apiBase
    if (input.modelName !== undefined) cfg.modelName = input.modelName
    if (input.isEnabled !== undefined) cfg.isEnabled = input.isEnabled ? 1 : 0
    if (input.weight !== undefined) cfg.weight = input.weight
    if (input.priority !== undefined) cfg.priority = input.priority
    if (input.balanceQueryUrl !== undefined) cfg.balanceQueryUrl = input.balanceQueryUrl

    // 设为默认 → 取消其他默认
    if (input.isDefault) {
      await this.configRepo.update(
        { id: Not(cfg.id), isDeleted: 0 },
        { isDefault: 0 },
      )
    }

    const saved = await this.configRepo.save(cfg)
    this.logger.log(`[Provider] ${operatorId ? `管理员${operatorId}` : '系统'} 编辑 Provider: ${cfg.providerKey}`)
    await this.syncToRedis()
    return this.toVO(saved)
  }

  /** 软删除 Provider */
  async remove(id: number, operatorId?: number): Promise<void> {
    const cfg = await this.configRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!cfg) throw new BadRequestException('Provider 不存在')

    cfg.isDeleted = 1
    await this.configRepo.save(cfg)
    this.logger.log(`[Provider] ${operatorId ? `管理员${operatorId}` : '系统'} 删除 Provider: ${cfg.providerKey}`)
    await this.syncToRedis()
  }

  /** 设为默认 Provider */
  async setDefault(id: number, operatorId?: number): Promise<void> {
    const cfg = await this.configRepo.findOne({ where: { id, isDeleted: 0 } })
    if (!cfg) throw new BadRequestException('Provider 不存在')
    if (!cfg.isEnabled) throw new BadRequestException('Provider 未启用，无法设为默认')

    await this.configRepo.update({ isDeleted: 0 }, { isDefault: 0 })
    cfg.isDefault = 1
    await this.configRepo.save(cfg)
    this.logger.log(`[Provider] ${operatorId ? `管理员${operatorId}` : '系统'} 设置默认 Provider: ${cfg.providerKey}`)
    await this.syncToRedis()
  }

  // ==================== 负载均衡策略 ====================

  /** 获取当前策略 */
  async getStrategy(): Promise<LoadBalanceConfig> {
    const cached = await this.redis.get(PROVIDER_STRATEGY_KEY)
    return {
      strategy: (cached as LoadBalanceStrategy) || this.currentStrategy,
      updatedAt: new Date().toISOString(),
    }
  }

  /** 切换策略 */
  async setStrategy(strategy: LoadBalanceStrategy, operatorId?: number): Promise<void> {
    this.currentStrategy = strategy
    await this.redis.set(PROVIDER_STRATEGY_KEY, strategy, 0)
    this.logger.log(`[Provider] ${operatorId ? `管理员${operatorId}` : '系统'} 切换策略: ${strategy}`)
  }

  // ==================== 内部方法 ====================

  private toVO(cfg: AiProviderConfig): ProviderConfigVO {
    return {
      id: cfg.id,
      providerKey: cfg.providerKey,
      displayName: cfg.displayName,
      apiKeyMasked: maskApiKey(cfg.apiKeyEncrypted),
      apiBase: cfg.apiBase,
      modelName: cfg.modelName,
      isEnabled: cfg.isEnabled,
      isDefault: cfg.isDefault,
      weight: cfg.weight,
      priority: cfg.priority,
      balanceQueryUrl: cfg.balanceQueryUrl || undefined,
      createdAt: cfg.createdAt?.toISOString?.() || '',
      updatedAt: cfg.updatedAt?.toISOString?.() || '',
    }
  }
}
