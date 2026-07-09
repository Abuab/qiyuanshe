import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * HTTP 请求日志中间件
 * 记录每个请求的：方法 URL 状态码 响应耗时 IP User-Agent
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    const { method, originalUrl, ip } = req

    // 响应结束时记录日志
    res.on('finish', () => {
      const duration = Date.now() - start
      const statusCode = res.statusCode
      const userAgent = (req.headers['user-agent'] || '-').slice(0, 100)

      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`

      if (statusCode >= 500) {
        this.logger.error(message)
      } else if (statusCode >= 400) {
        this.logger.warn(message)
      } else {
        this.logger.log(message)
      }
    })

    next()
  }
}
