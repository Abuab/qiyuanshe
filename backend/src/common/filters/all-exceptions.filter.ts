import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { Result } from '../result'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器内部错误'
    let code = 500
    let errorData: any = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
        code = status
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>
        if (typeof responseObj.message === 'object' && responseObj.message !== null) {
          // class-validator 返回的 message 可能是数组，例如 ["birthMonth must not be less than 1"]
          if (Array.isArray(responseObj.message)) {
            message = responseObj.message.join('; ')
          } else {
            const inner = responseObj.message as Record<string, any>
            message = inner.message || exception.message
            if (inner.reasons) errorData = { reasons: inner.reasons }
            if (typeof inner.code === 'string') code = status
          }
        } else {
          message = responseObj.message || exception.message
        }
        code = typeof responseObj.code === 'number' ? responseObj.code : status
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }

    const result = Result.error(message, code, errorData)

    // CORS 头由 main.ts 中的全局 CORS 配置统一处理，
    // 此处不再覆盖，避免与 credentials: true 冲突导致浏览器拒绝携带 cookie。
    response.status(status).json(result)
  }
}
