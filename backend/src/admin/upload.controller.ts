import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { Result } from '../common/result'

interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
}

const ensureDirectoryExists = (dir: string) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// 使用固定路径，与 main.ts 保持一致，避免编译后 __dirname 不一致
const uploadsDir = '/app/uploads'
const certDir = join(uploadsDir, 'cert')

ensureDirectoryExists(uploadsDir)
ensureDirectoryExists(certDir)

@Controller('admin/upload')
@UseGuards(AdminJwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `upload-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传图片文件'), false)
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: UploadedFile) {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    // 返回相对路径，前端通过代理访问
    // 如果配置了API_BASE_URL环境变量，则返回完整URL
    const baseUrl = process.env.API_BASE_URL || ''
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/uploads/${file.filename}`
      : `/uploads/${file.filename}`
    return Result.success({ url })
  }

  @Post('cert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: certDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `cert-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传图片文件'), false)
        }
      },
    }),
  )
  async uploadCert(@UploadedFile() file: UploadedFile) {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    return Result.success({ path: `/uploads/cert/${file.filename}` })
  }
}
