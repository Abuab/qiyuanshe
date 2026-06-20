import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { redisConfig } from '../config/redis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redis: Redis | null = null

  getClient(): Redis {
    if (!this.redis) {
      this.redis = new Redis(redisConfig())
      this.redis.on('error', () => {})
    }
    return this.redis
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient()
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await client.set(key, value, 'EX', ttlSeconds)
    } else {
      await client.set(key, value)
    }
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key)
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key)
  }

  async incr(key: string): Promise<number> {
    return this.getClient().incr(key)
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.getClient().expire(key, seconds)
  }

  async ttl(key: string): Promise<number> {
    return this.getClient().ttl(key)
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit()
      } catch (e) {
        // ignore
      }
      this.redis = null
    }
  }
}
