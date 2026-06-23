import { join } from 'path'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { WsAdapter } from '@nestjs/platform-ws'
import * as fs from 'fs'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn'],
  })

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
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

  // 指定 WebSocket 适配器为 ws（非 socket.io），与 @nestjs/platform-ws 配套使用
  app.useWebSocketAdapter(new WsAdapter(app))

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )

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
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    },
  })

  app.useStaticAssets(join(__dirname, '..', 'static'), {
    prefix: '/static',
  })

  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
}

bootstrap()
