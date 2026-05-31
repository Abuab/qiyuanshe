import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Result } from '../result'

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Result<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Result<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果已经是 Result 实例，直接返回
        if (data instanceof Result) {
          return data
        }
        // 如果 data 有 code 和 data 属性，说明已经是包装好的响应
        if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
          return data as any
        }
        return Result.success(data)
      }),
    )
  }
}
