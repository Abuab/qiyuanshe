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
        if (data instanceof Result) {
          return data
        }
        return Result.success(data)
      }),
    )
  }
}
