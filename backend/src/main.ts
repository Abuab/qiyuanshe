import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import * as fs from 'fs'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

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
  const uploadsDir = join(__dirname, '..', 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // 注册静态资源（必须在 setGlobalPrefix 之前，避免被加上 /api 前缀）
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
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
