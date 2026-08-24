import { join } from 'path'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { WsAdapter } from '@nestjs/platform-ws'
import { WinstonModule } from 'nest-winston'
import * as fs from 'fs'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware'
import { RequestIdMiddleware } from './common/logger/request-id.middleware'
import { WinstonLoggerService } from './common/logger/winston-logger.service'

// 设置 Node.js 进程时区为北京时间（影响 Logger 时间戳、toLocaleString、Date.toString 等）
process.env.TZ = 'Asia/Shanghai'

async function bootstrap() {
  // 先创建一个临时 Winston 实例供 NestJS 启动阶段使用
  const winstonLoggerService = new WinstonLoggerService()

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 捕获原始请求体（req.rawBody），供微信支付 V3 回调验签使用
    rawBody: true,
    // 使用 Winston 替换 NestJS 内置 Logger，同时保留所有日志级别
    logger: WinstonModule.createLogger({
      instance: winstonLoggerService.getWinstonInstance(),
    }),
  })

  // 获取模块中已初始化的 WinstonLoggerService，供后续动态调整日志级别
  const loggerService = app.get(WinstonLoggerService)
  const logLevel = process.env.LOG_LEVEL || 'debug'
  loggerService.setLogLevel(logLevel)

  // 将 Winston 设为全局 Logger，替换所有 new Logger() 实例的输出
  app.useLogger(loggerService)

  // ===== 生产环境 CORS 校验 =====
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    const corsOrigins = (process.env.CORS_ORIGINS || '').trim()
    if (!corsOrigins) {
      loggerService.error('FATAL: CORS_ORIGINS environment variable must be set in production')
      process.exit(1)
    }
    // 生产环境禁止通配符：`*` 与 credentials: true 组合会反射任意 Origin 并携带凭证，
    // 导致任意网站可带凭证发起跨域请求
    if (corsOrigins.split(',').some(s => s.trim() === '*')) {
      loggerService.error('FATAL: CORS_ORIGINS must not contain "*" in production (conflicts with credentials: true)')
      process.exit(1)
    }
  }

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : ['*']

  app.enableCors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  // ===== HTTP 安全头 =====
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    next()
  })

  // 指定 WebSocket 适配器为 ws（非 socket.io），与 @nestjs/platform-ws 配套使用
  app.useWebSocketAdapter(new WsAdapter(app))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )

  // 请求追踪 ID 中间件（必须在请求日志中间件之前执行）
  const reqIdMiddleware = app.get(RequestIdMiddleware)
  app.use((req, res, next) => reqIdMiddleware.use(req, res, next))

  // HTTP 请求日志（方法 路径 状态码 耗时）
  const reqLogger = new RequestLoggerMiddleware()
  app.use((req, res, next) => reqLogger.use(req, res, next))

  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalInterceptors(new TransformInterceptor())

  // 确保 uploads 目录存在
  const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // 静态文件前置检查：文件不存在 → 404，避免 express.static 内部异常落入 NestJS 返回 500
  app.use('/uploads', (req, res, next) => {
    const fileName = req.path.replace(/^\//, '').split('?')[0]
    // 防止路径穿越
    if (fileName.includes('..')) {
      return res.status(403).json({ code: 403, message: '禁止访问' })
    }
    const filePath = join(uploadsDir, fileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }
    // 确保文件可读，避免 EACCES 被 express.static 转为 500
    try { fs.accessSync(filePath, fs.constants.R_OK) } catch {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }
    next()
  })

  // 注册静态资源（必须在 setGlobalPrefix 之前，避免被加上 /api 前缀）
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000')
    },
  })

  app.useStaticAssets(join(__dirname, '..', 'static'), {
    prefix: '/static',
  })

  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3000
  await app.listen(port)
  loggerService.log(`Application is running on: http://localhost:${port}`, 'Bootstrap')
}

bootstrap()
