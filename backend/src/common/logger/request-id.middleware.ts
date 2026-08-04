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

    const rawIp = req.ip || req.socket.remoteAddress || ''
    // Docker 内网中 Express req.ip 返回 IPv4-mapped IPv6 格式 (::ffff:x.x.x.x)
    // 去除 ::ffff: 前缀，保留纯 IPv4，非 IPv4-mapped 地址原样保留
    const ip = rawIp.replace(/^::ffff:/, '') || undefined

    const ctx = {
      traceId,
      ip,
      method: req.method,
      url: req.originalUrl,
    }

    RequestContext.run(ctx, () => next())
  }
}
