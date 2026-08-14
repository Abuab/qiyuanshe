import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdminAuditLog } from '../entities/AdminAuditLog'

/** 需要记录操作日志的管理后台 API 路径前缀 */
const AUDIT_ROUTE_PREFIXES = [
  '/admin/users',
  '/admin/audit',
  '/admin/payment',
  '/admin/questions',
  '/admin/activities',
  '/admin/system',
  '/admin/reports',
  '/admin/feedbacks',
  '/admin/matchmakers',
  '/admin/circles',
  '/admin/success-cases',
  '/admin/admin-users',
  '/admin/vip-packages',
  '/admin/vip-config',
  '/admin/ai',
  '/admin/chat',
  '/admin/store-cert',

  '/admin/user-profiles',
  '/admin/quick-questions',
  '/admin/matchmaker-comments',
  '/admin/guide',
  '/admin/agreement-log-storage',
  '/admin/upload',
  '/admin/mfa',
  '/admin/personality',
  '/admin/profile',

  // 单线承诺书管理端路由格式为 /single-promise/admin/* 而非 /admin/single-promise/*
  '/single-promise/admin',
]

/** 从路径中提取模块名（兼容 /admin/xxx 和 /single-promise/admin 两种格式） */
function extractModule(url: string): string {
  // 先匹配 /single-promise/admin 格式，避免被 /admin/ 通用规则误匹配
  let match = url.match(/\/(single-promise\/admin)/)
  if (match) return match[1]
  // 再匹配 /admin/xxx 格式
  match = url.match(/\/admin\/([^\/\?]+)/)
  if (match) return match[1]
  return 'unknown'
}

/** 将 HTTP 方法映射为中文操作名（模块信息已存储在独立 module 列） */
function actionLabel(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST': return '创建'
    case 'PUT': return '更新'
    case 'DELETE': return '删除'
    default: return method
  }
}

/** 提取客户端真实 IP（优先 X-Forwarded-For 首个，兼容反向代理） */
function getClientIp(request: any): string {
  const xff = request.headers?.['x-forwarded-for']
  if (xff) {
    const first = String(xff).split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers?.['x-real-ip']
  if (realIp) return String(realIp)
  return request.ip || request.connection?.remoteAddress || request.socket?.remoteAddress || ''
}

/** 仅允许写入审计详情的 ID 类字段（避免密码/token 等敏感信息入库） */
const DETAIL_ID_FIELDS = [
  'id', 'userId', 'adminId', 'targetId', 'orderId', 'activityId',
  'questionId', 'circleId', 'postId', 'commentId', 'matchmakerId',
  'reportId', 'feedbackId',
]

/** 从请求中提取操作对象 ID 作为审计详情（只取 ID 类字段，不落敏感数据） */
function extractDetail(request: any): string {
  const parts: string[] = []
  const paramId = request.params?.id
  const hasParamId = paramId !== undefined && paramId !== null && paramId !== ''
  if (hasParamId) {
    parts.push(`id=${paramId}`)
  }
  const body = request.body
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of DETAIL_ID_FIELDS) {
      // 路径参数已有 id 时，跳过 body 里的 id，避免重复
      if (key === 'id' && hasParamId) continue
      const value = body[key]
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}=${value}`)
      }
    }
  }
  return parts.join(' ')
}

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const rawUrl = request.url || ''
    // 去掉全局前缀 /api（若有），用业务路径匹配审计白名单
    const url = rawUrl.replace(/^\/api(?=\/)/, '')
    const method = request.method || ''

    // 只记录写操作（POST/PUT/DELETE），跳过轮询接口
    if (method === 'GET') return next.handle()

    const isAudited = AUDIT_ROUTE_PREFIXES.some(prefix => url.startsWith(prefix))
    if (!isAudited) return next.handle()

    const adminUser = (request as any).user
    const adminId = adminUser?.id || 0
    const adminUsername = adminUser?.username || 'unknown'
    const module = extractModule(url)
    const ip = getClientIp(request)
    const detail = extractDetail(request)

    return next.handle().pipe(
      tap(() => {
        try {
          const log = this.auditRepo.create({
            adminId,
            adminUsername,
            action: actionLabel(method),
            module,
            method: method.toUpperCase(),
            url: url.substring(0, 500),
            ip,
            detail: detail || null,
          })
          this.auditRepo.save(log).catch(() => {
            // 日志记录失败不阻塞主流程
          })
        } catch {
          // 日志记录失败不阻塞主流程
        }
      }),
    )
  }
}
