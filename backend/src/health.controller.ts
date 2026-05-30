import { Controller, Get } from '@nestjs/common'
import { Result } from './common/result'
import { DataSource } from 'typeorm'
import Redis from 'ioredis'

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  private redis: Redis

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
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
        lazyConnect: true,
      })
      await this.redis.ping()
      redisOk = true
      await this.redis.quit()
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
}
