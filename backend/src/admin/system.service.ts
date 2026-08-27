import { Injectable, Optional, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import { RedisService } from '../common/redis.service'

/** 系统配置缓存 key 前缀（与 system/system.service.ts 保持一致） */
const SYS_CFG_PREFIX = 'sys:cfg:'

export interface SystemConfigs {
  basic?: Record<string, any>
  share?: Record<string, any>
  vip?: Record<string, any>
  audit?: Record<string, any>
  dict?: Record<string, any>
  icon?: Record<string, any>
  notify?: Record<string, any>
  health?: Record<string, any>
}

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
    @Optional()
    @Inject(RedisService)
    private readonly redisService?: RedisService,
  ) {}

  async getConfigs(): Promise<SystemConfigs> {
    const configs = await this.systemConfigRepository.find()
    const result: SystemConfigs = {}

    configs.forEach((config) => {
      const parts = config.configKey.split('.')
      if (parts.length === 2) {
        const [group, key] = parts
        if (!result[group as keyof SystemConfigs]) {
          result[group as keyof SystemConfigs] = {}
        }
        try {
          result[group as keyof SystemConfigs]![key] = JSON.parse(config.configValue || 'null')
        } catch {
          result[group as keyof SystemConfigs]![key] = config.configValue
        }
      }
    })

    return result
  }

  async saveConfigs(configs: SystemConfigs) {
    for (const [group, groupConfigs] of Object.entries(configs)) {
      if (groupConfigs) {
        for (const [key, value] of Object.entries(groupConfigs)) {
          const configKey = `${group}.${key}`
          const configValue = typeof value === 'string' ? value : JSON.stringify(value)

          let config = await this.systemConfigRepository.findOne({
            where: { configKey },
          })

          if (config) {
            config.configValue = configValue
            await this.systemConfigRepository.save(config)
          } else {
            config = this.systemConfigRepository.create({
              configKey,
              configValue,
              description: `${group} ${key}`,
            })
            await this.systemConfigRepository.save(config)
          }
        }
      }
    }

    await this.invalidateConfigCache()
  }

  async getConfig(key: string): Promise<string | null> {
    const config = await this.systemConfigRepository.findOne({
      where: { configKey: key },
    })
    return config ? config.configValue : null
  }

  async updateConfig(key: string, value: string) {
    let config = await this.systemConfigRepository.findOne({
      where: { configKey: key },
    })

    if (config) {
      config.configValue = value
      await this.systemConfigRepository.save(config)
    } else {
      config = this.systemConfigRepository.create({
        configKey: key,
        configValue: value,
        description: key,
      })
      await this.systemConfigRepository.save(config)
    }

    await this.invalidateConfigCache()
  }

  /** 清空系统配置缓存（与 system.service.ts 共用同一前缀） */
  private async invalidateConfigCache(): Promise<void> {
    try {
      await this.redisService?.delByPattern(`${SYS_CFG_PREFIX}*`)
    } catch {
      // 缓存清理失败不影响主流程
    }
  }
}
