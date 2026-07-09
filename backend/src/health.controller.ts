import { Controller, Get } from '@nestjs/common'
import { Result } from './common/result'
import { DataSource } from 'typeorm'
import { RedisService } from './common/redis.service'
import { beijingISO } from './common/utils/date-utils'

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

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
      // 复用 RedisService 的连接池进行 ping 检查，不再创建独立连接
      const result = await this.redisService.getClient().ping()
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
      timestamp: beijingISO(),
    })
  }
}
