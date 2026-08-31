import { HttpException, HttpStatus } from '@nestjs/common'

export type LicenseBizCode = 'LICENSE_EXPIRED' | 'LICENSE_INVALID'

/**
 * 授权异常：写入接口在授权过期/未授权时抛出。
 * 响应体：{ statusCode: 403, bizCode, message }
 * 由 AllExceptionsFilter 透传 bizCode 到前端。
 */
export class LicenseException extends HttpException {
  constructor(bizCode: LicenseBizCode, message: string) {
    super(
      { statusCode: HttpStatus.FORBIDDEN, bizCode, message },
      HttpStatus.FORBIDDEN,
    )
  }
}
