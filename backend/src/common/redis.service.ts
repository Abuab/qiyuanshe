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

  /** 按通配符模式删除 key，如 v3:rec:* */
  async delByPattern(pattern: string): Promise<number> {
    const client = this.getClient()
    let cursor = '0'
    let totalDeleted = 0
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH', pattern,
        'COUNT', 100,
      )
      cursor = nextCursor
      if (keys.length > 0) {
        totalDeleted += await client.del(...keys)
      }
    } while (cursor !== '0')
    return totalDeleted
  }

  async incr(key: string): Promise<number> {
    return this.getClient().incr(key)
  }

  /**
   * 原子自增并在 key 首次创建时设置过期时间。
   * 用于风控限频计数：并发下 TTL 只设置一次，避免每次请求都刷新过期时间导致窗口无限延长。
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const script = `
      local c = redis.call('INCR', KEYS[1])
      if c == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return c
    `
    const result = await this.getClient().eval(script, 1, key, ttlSeconds)
    return Number(result)
  }

  /**
   * 仅当 key 不存在时写入（SET NX）。用于一次性 nonce 去重。
   * 返回 true 表示首次写入成功；false 表示 key 已存在（重复请求）。
   */
  async setNx(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const client = this.getClient()
    const result =
      ttlSeconds !== undefined && ttlSeconds > 0
        ? await client.set(key, value, 'EX', ttlSeconds, 'NX')
        : await client.set(key, value, 'NX')
    return result === 'OK'
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
