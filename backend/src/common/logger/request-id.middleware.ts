import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'
import { RequestContext } from './request-context'

/**
 * 请求追踪中间件
 * 注入 X-Request-Id → 响应头 + 请求上下文（AsyncLocalStorage）
 * 优先使用上游传入的 X-Request-Id，无则生成新的
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId =
      (req.headers['x-request-id'] as string) ||
      randomBytes(8).toString('hex')

    // 写入响应头，便于前端/客户端关联
    res.setHeader('x-request-id', traceId)

    const ctx = {
      traceId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      method: req.method,
      url: req.originalUrl,
    }

    RequestContext.run(ctx, () => next())
  }
}
