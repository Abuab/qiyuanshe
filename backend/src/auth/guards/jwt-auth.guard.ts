import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }
}

/**
 * 可选的 JWT 认证守卫：有 token 就解析出用户，没有也不报错。
 * 适用于需要知道当前用户（如性别互推）但允许未登录访问的接口。
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // 出错或无 token 时不抛异常，直接返回 null
    return user || null
  }
}
