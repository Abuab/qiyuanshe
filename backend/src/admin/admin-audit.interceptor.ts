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
  // 先尝试 /admin/xxx 格式
  let match = url.match(/\/admin\/([^\/\?]+)/)
  if (match) return match[1]
  // 再尝试 /single-promise/admin 格式
  match = url.match(/\/(single-promise\/admin)/)
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

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const url = request.url || ''
    const method = request.method || ''

    // 只记录写操作（POST/PUT/DELETE），跳过轮询接口
    if (method === 'GET') return next.handle()

    const isAudited = AUDIT_ROUTE_PREFIXES.some(prefix => url.startsWith(prefix))
    if (!isAudited) return next.handle()

    const adminUser = (request as any).user
    const adminId = adminUser?.id || 0
    const adminUsername = adminUser?.username || 'unknown'
    const module = extractModule(url)
    const ip = request.ip || request.connection?.remoteAddress || ''

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
