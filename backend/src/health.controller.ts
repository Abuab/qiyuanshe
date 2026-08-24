import { Controller, Get, Logger, Res, HttpStatus } from '@nestjs/common'
import { Result } from './common/result'
import { DataSource } from 'typeorm'
import { RedisService } from './common/redis.service'
import { beijingISO } from './common/utils/date-utils'
import type { Response } from 'express'

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let mysqlOk = false
    let redisOk = false

    try {
      await this.dataSource.query('SELECT 1')
      mysqlOk = true
    } catch (error) {
      this.logger.error('MySQL health check failed:', error)
    }

    try {
      // 复用 RedisService 的连接池进行 ping 检查，不再创建独立连接
      const result = await this.redisService.getClient().ping()
      redisOk = result === 'PONG'
    } catch (error) {
      this.logger.error('Redis health check failed:', error)
    }

    const healthy = mysqlOk && redisOk
    // 依赖不可用时返回 503，使 docker healthcheck 正确标记为 unhealthy
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)

    return Result.success({
      status: healthy ? 'ok' : 'degraded',
      services: {
        mysql: mysqlOk,
        redis: redisOk,
      },
      timestamp: beijingISO(),
    })
  }
}
