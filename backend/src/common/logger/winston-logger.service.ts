import { Injectable, LoggerService, LogLevel } from '@nestjs/common'
import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { join } from 'path'
import { RequestContext } from './request-context'

/**
 * Winston 日志服务
 * - 控制台输出：开发环境 pretty 格式，生产环境 JSON
 * - 文件输出：JSON 格式，按天滚动，保留 30 天
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly winstonLogger: winston.Logger

  constructor() {
    const logDir = process.env.LOG_DIR || join(process.cwd(), 'logs')
    const isProduction = process.env.NODE_ENV === 'production'

    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        this.contextFormat(),
        isProduction
          ? winston.format.json()
          : winston.format.printf(({ timestamp, level, message, context, traceId, stack, ...meta }) => {
              const ctxStr = context ? `[${context}]` : ''
              const traceStr = traceId ? `[${traceId}]` : ''
              const stackStr = stack ? `\n${stack}` : ''
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
              return `${timestamp} ${level.toUpperCase().padEnd(5)} ${ctxStr}${traceStr} ${message}${metaStr}${stackStr}`
            }),
      ),
      transports: [
        // 控制台输出
        new winston.transports.Console({
          handleExceptions: false, // 由全局异常过滤器统一处理
        }),
        // 文件输出：按天滚动
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '20m',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            this.contextFormat(),
            winston.format.json(),
          ),
        }),
        // 错误日志单独文件
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '20m',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            this.contextFormat(),
            winston.format.json(),
          ),
        }),
      ],
    })
  }

  /**
   * 注入请求上下文（traceId 等）到日志 meta 字段
   * 从 AsyncLocalStorage 读取当前请求上下文
   */
  private contextFormat(): winston.Logform.Format {
    return winston.format((info) => {
      const ctx = RequestContext.get()
      if (ctx) {
        info.traceId = ctx.traceId
        if (ctx.ip) info.ip = ctx.ip
        if (ctx.method) info.method = ctx.method
        if (ctx.url) info.url = ctx.url
      }
      return info
    })()
  }

  log(message: any, context?: string) {
    this.winstonLogger.info(this.normalize(message), { context })
  }

  error(message: any, trace?: string, context?: string) {
    this.winstonLogger.error(this.normalize(message), { context, stack: trace })
  }

  warn(message: any, context?: string) {
    this.winstonLogger.warn(this.normalize(message), { context })
  }

  debug(message: any, context?: string) {
    this.winstonLogger.debug(this.normalize(message), { context })
  }

  verbose(message: any, context?: string) {
    this.winstonLogger.verbose(this.normalize(message), { context })
  }

  /** 设置日志级别，运行时动态调整 */
  setLogLevel(level: string) {
    this.winstonLogger.level = level
  }

  /** 获取底层 Winston 实例，供 NestJS 直接使用 */
  getWinstonInstance(): winston.Logger {
    return this.winstonLogger
  }

  private normalize(message: any): string {
    if (typeof message === 'string') return message
    if (message instanceof Error) return message.message
    return JSON.stringify(message)
  }
}
