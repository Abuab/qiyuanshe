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
    const request = ctx.getRequest()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器内部错误'
    let code = 500
    let errorData: any = undefined
    let bizCode: string | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
        code = status
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>
        if (typeof responseObj.bizCode === 'string') bizCode = responseObj.bizCode
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
    } else if (this.isMulterFileTooLarge(exception)) {
      // multer 文件大小超限（图片上传超过 5MB）
      status = HttpStatus.BAD_REQUEST
      message = '图片不能超过 5MB'
      code = 400
    } else if (this.isPayloadTooLarge(exception)) {
      // body-parser JSON 请求体超限（base64 图片超过 10MB）
      status = HttpStatus.PAYLOAD_TOO_LARGE
      message = '上传内容过大，请压缩后重试'
      code = 413
    } else if (exception instanceof Error) {
      // 非生产环境返回具体错误便于调试，生产环境仅返回通用错误防止信息泄露
      const isProd = process.env.NODE_ENV === 'production'
      message = isProd ? '服务器内部错误' : exception.message
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }

    const result = Result.error(message, code, errorData)
    if (bizCode) result.bizCode = bizCode

    // 服务器内部错误发送告警通知
    const alertUrl = process.env.ERROR_ALERT_WEBHOOK_URL
    if (status >= 500 && alertUrl) {
      this.sendAlert(alertUrl, status, message, exception, request).catch(() => {})
    }

    response.status(status).json(result)
  }

  /** 判断是否为 multer 文件大小超限错误（图片上传 > 5MB） */
  private isMulterFileTooLarge(exception: unknown): boolean {
    if (typeof exception !== 'object' || exception === null) return false
    const e = exception as { name?: unknown; code?: unknown }
    return e.name === 'MulterError' && e.code === 'LIMIT_FILE_SIZE'
  }

  /** 判断是否为 body-parser 请求体超限错误（base64 图片 > 10MB） */
  private isPayloadTooLarge(exception: unknown): boolean {
    if (typeof exception !== 'object' || exception === null) return false
    const e = exception as { type?: unknown }
    return e.type === 'entity.too.large'
  }

  /**
   * 向企业微信/飞书/钉钉 Webhook 发送错误告警
   * 消息格式兼容企业微信机器人 Markdown 类型
   */
  private async sendAlert(
    webhookUrl: string,
    status: number,
    message: string,
    exception: unknown,
    request: any,
  ) {
    const traceId = request?.headers?.['x-request-id'] || '-'
    const appEnv = process.env.NODE_ENV || 'unknown'
    const instance = process.env.INSTANCE_ID || require('os')?.hostname?.() || 'unknown'
    const stack = exception instanceof Error
      ? (exception.stack || '').split('\n').slice(0, 5).join('\n')
      : ''

    const alertContent =
      `## 🚨 服务器错误告警\n` +
      `> 环境: <font color="warning">${appEnv}</font>\n` +
      `> 实例: <font color="comment">${instance}</font>\n` +
      `> 状态码: <font color="warning">${status}</font>\n` +
      `> 错误: ${message}\n` +
      `> TraceId: \`${traceId}\`\n` +
      `> 时间: ${new Date().toISOString()}\n` +
      (stack ? `\n**堆栈（前5行）:**\n\`\`\`\n${stack}\n\`\`\`` : '')

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { content: alertContent },
        }),
      })
    } catch {
      // 告警发送失败静默处理，避免告警系统自身故障影响业务
    }
  }
}
