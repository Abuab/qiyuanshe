import { Controller, Get, OnModuleDestroy } from '@nestjs/common'
import { Result } from './common/result'
import { DataSource } from 'typeorm'
import Redis from 'ioredis'
import { redisConfig } from './config/redis'

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private sharedRedis: Redis | null = null

  constructor(private readonly dataSource: DataSource) {}

  private getRedis(): Redis {
    if (!this.sharedRedis) {
      this.sharedRedis = new Redis(redisConfig())
      this.sharedRedis.on('error', () => {})
    }
    return this.sharedRedis
  }

  @Get()
  async check() {
    let mysqlOk = false
    let redisOk = false

    try {
      await this.dataSource.query('SELECT 1')
      mysqlOk = true
    } catch (error) {
      console.error('MySQL health check failed:', error)
    }

    try {
      const redis = this.getRedis()
      const result = await redis.ping()
      redisOk = result === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
    }

    return Result.success({
      status: mysqlOk && redisOk ? 'ok' : 'degraded',
      services: {
        mysql: mysqlOk,
        redis: redisOk,
      },
      timestamp: new Date().toISOString(),
    })
  }

  async onModuleDestroy() {
    if (this.sharedRedis) {
      try {
        await this.sharedRedis.quit()
      } catch (e) {
        // ignore
      }
      this.sharedRedis = null
    }
  }
}
