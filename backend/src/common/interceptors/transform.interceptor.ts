import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Result } from '../result'
import { normalizeImageUrl } from '../image-url'

const IMAGE_URL_FIELDS = new Set([
  'avatar', 'cover', 'icon', 'qrCode', 'qrcode', 'photoUrl',
  'imageUrl', 'images', 'photos', 'url', 'userAvatar',
  'blockerAvatar', 'matchedAvatar', 'matchmakerAvatar',
])

/**
 * 递归遍历对象，将已知图片字段中的 IP 绝对路径转为相对路径
 */
function deepNormalizeImageUrls(obj: any, depth = 0): any {
  if (depth > 20 || obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => deepNormalizeImageUrls(item, depth + 1))
  }

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && IMAGE_URL_FIELDS.has(key)) {
      result[key] = normalizeImageUrl(value)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepNormalizeImageUrls(value, depth + 1)
    } else {
      result[key] = value
    }
  }
  return result
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Result<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Result<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果已经是 Result 实例，规范化 data 中的图片 URL
        if (data instanceof Result) {
          data.data = deepNormalizeImageUrls(data.data)
          return data
        }
        // 如果 data 有 code 和 data 属性，说明已经是包装好的响应
        if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
          return deepNormalizeImageUrls(data)
        }
        return Result.success(deepNormalizeImageUrls(data))
      }),
    )
  }
}
