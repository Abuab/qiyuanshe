import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SystemConfig } from '../entities/SystemConfig'
import Redis from 'ioredis'

@Injectable()
export class SystemService {
  private readonly CACHE_KEY = 'system:configs:'
  private readonly CACHE_TTL = 3600
  private redis: Redis

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
    })
  }

  async getAllConfigs(): Promise<Record<string, any>> {
    const cacheKey = this.CACHE_KEY + 'all'

    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const configs = await this.configRepository.find()

    const result: Record<string, any> = {
      basic: {},
      share: {},
      vip: {},
      payment: {},
      audit: {},
    }

    for (const config of configs) {
      const [group, key] = config.configKey.split(':')
      if (group && key) {
        if (!result[group]) {
          result[group] = {}
        }
        try {
          result[group][key] = JSON.parse(config.configValue)
        } catch {
          result[group][key] = config.configValue
        }
      }
    }

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL)

    return result
  }

  async getConfig(key: string): Promise<string | null> {
    const cacheKey = this.CACHE_KEY + key

    const cached = await this.redis.get(cacheKey)
    if (cached) {
      return cached
    }

    const config = await this.configRepository.findOne({ where: { configKey: key } })
    if (config) {
      await this.redis.set(cacheKey, config.configValue, 'EX', this.CACHE_TTL)
      return config.configValue
    }

    return null
  }

  async saveConfigs(configs: Record<string, Record<string, any>>): Promise<void> {
    for (const [group, items] of Object.entries(configs)) {
      for (const [key, value] of Object.entries(items as any)) {
        const configKey = `${group}:${key}`
        const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

        let config = await this.configRepository.findOne({ where: { configKey } })

        if (config) {
          await this.configRepository.update(config.id, { configValue })
        } else {
          config = this.configRepository.create({
            configKey,
            configValue,
            description: `${group}:${key}`,
          })
          await this.configRepository.save(config)
        }
      }
    }

    await this.redis.del(this.CACHE_KEY + 'all')
  }

  async clearCache(): Promise<void> {
    await this.redis.del(this.CACHE_KEY + 'all')
  }
}
