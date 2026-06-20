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
        // NestJS 将 BadRequestException({ code, message, reasons }) 包装为 { message: { code, message, reasons } }
        // 此处展平：优先使用内层 message 字符串
        if (typeof responseObj.message === 'object' && responseObj.message !== null) {
          const inner = responseObj.message as Record<string, any>
          message = inner.message || exception.message
          // 透传业务层自定义字段（如 reasons, code 等）给前端
          if (inner.reasons) errorData = { reasons: inner.reasons }
          if (typeof inner.code === 'string') code = status
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

    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
    response.header('Access-Control-Allow-Credentials', 'true')
    response.status(status).json(result)
  }
}
