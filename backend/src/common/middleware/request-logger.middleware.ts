import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * HTTP 请求日志中间件（企业级）
 *
 * 日志策略：
 *  - 2xx/3xx：不记录（由 nginx access log 覆盖，避免重复）
 *  - 4xx：warn 级别
 *  - 5xx：error 级别
 *
 * 安全策略：
 *  - URL 中的 token 参数脱敏为 token=***
 *
 * 性能策略：
 *  - /api/health、/api/cos/image、/uploads/ 请求全部跳过（由 nginx 覆盖）
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  /** 完全跳过日志的路径前缀 */
  private static readonly SKIP_PREFIXES = ['/api/health', '/api/cos/image', '/uploads/']

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    const { method, ip } = req

    // 脱敏：移除 URL 中的 token / 身份证号 / 姓名 等敏感参数（防止 PII 泄漏进日志）
    const sanitizedUrl = req.originalUrl.replace(
      /([?&])(token|access_token|secret|signature|idcard|realname)=[^&]*/gi,
      '$1$2=***',
    )

    res.on('finish', () => {
      const duration = Date.now() - start
      const statusCode = res.statusCode
      const userId = (req as any).user?.id || (req as any).user?.sub

      // 图片/健康检查请求：仅在异常时记录
      const isSkipPath = RequestLoggerMiddleware.SKIP_PREFIXES.some(
        (prefix) => req.originalUrl.startsWith(prefix),
      )
      if (isSkipPath) {
        if (statusCode >= 500) {
          this.logger.error(`${method} ${sanitizedUrl} ${statusCode} ${duration}ms`)
        } else if (statusCode >= 400) {
          this.logger.warn(`${method} ${sanitizedUrl} ${statusCode} ${duration}ms`)
        }
        return
      }

      // 仅记录 4xx/5xx（2xx/3xx 由 nginx access log 覆盖，消除重复）
      if (statusCode >= 500) {
        const uid = userId ? ` uid=${userId}` : ''
        this.logger.error(`${method} ${sanitizedUrl} ${statusCode} ${duration}ms${uid}`)
      } else if (statusCode >= 400) {
        const uid = userId ? ` uid=${userId}` : ''
        this.logger.warn(`${method} ${sanitizedUrl} ${statusCode} ${duration}ms${uid}`)
      }
    })

    next()
  }
}
