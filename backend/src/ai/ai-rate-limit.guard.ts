import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AiRateLimitService } from './ai-rate-limit.service'

/**
 * AI 功能标识装饰器 key
 * 用法：@AiCallType('match') → 指定该接口对应的 AI 功能
 */
export const AI_CALL_TYPE_KEY = 'aiCallType'
export const AiCallType = (type: string) => SetMetadata(AI_CALL_TYPE_KEY, type)

/**
 * AI 接口多维度防刷限流守卫
 *
 * 适用方式：
 * - 按路由装饰：@UseGuards(AiRateLimitGuard) @AiCallType('match')
 * - 按 Controller 装饰：@UseGuards(AiRateLimitGuard)
 *
 * 检查维度（按序）：
 * 1. 黑名单（IP/设备/用户）
 * 2. 异常 User-Agent
 * 3. 全局 QPS + 日预算
 * 4. IP 分钟限流
 * 5. 设备每日限流
 * 6. 用户（免费/会员）功能限流
 */
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiRateLimitGuard.name)

  constructor(
    private readonly rateLimitService: AiRateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    // 从装饰器获取 AI 功能类型
    let callType = this.reflector.get<string>(AI_CALL_TYPE_KEY, context.getHandler())
    if (!callType) {
      callType = this.reflector.get<string>(AI_CALL_TYPE_KEY, context.getClass())
    }
    if (!callType) {
      callType = 'default'
    }

    // 提取维度信息
    const userId = request.user?.userId ?? request.user?.id ?? 0
    const ip = this.extractIp(request)
    const userAgent = request.headers?.['user-agent'] || ''
    const deviceFingerprint = request.headers?.['x-device-fingerprint'] as string
      || request.headers?.['x-device-id'] as string
      || ''

    // 判断会员
    const isVip = this.isVip(request)

    // 执行限流检查
    const result = await this.rateLimitService.checkRateLimit(
      callType,
      userId,
      ip,
      userAgent,
      deviceFingerprint,
      isVip,
    )

    if (!result.allowed) {
      const statusCode = result.code?.startsWith('AI_BLACKLIST') ? HttpStatus.FORBIDDEN : HttpStatus.TOO_MANY_REQUESTS

      throw new HttpException(
        {
          code: result.code,
          message: result.message,
          details: result.details,
        },
        statusCode,
      )
    }

    return true
  }

  // ==================== 工具方法 ====================

  private extractIp(request: any): string {
    const xForwardedFor = request.headers?.['x-forwarded-for'] as string
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim()
    }
    return request.ip || request.connection?.remoteAddress || '127.0.0.1'
  }

  private isVip(request: any): boolean {
    const user = request.user
    if (!user) return false
    if (user.isVip === 1 && user.vipExpireTime) {
      return new Date(user.vipExpireTime) > new Date()
    }
    return false
  }
}
