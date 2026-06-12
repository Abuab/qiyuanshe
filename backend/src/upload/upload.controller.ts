import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
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

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']

const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
if (!existsSync(uploadsDir)) {
  try {
    mkdirSync(uploadsDir, { recursive: true })
  } catch (_) {
    // bind mount 下权限不足时静默失败，不阻塞进程启动
  }
}

/**
 * 小程序端公开图片上传（无需登录）
 */
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `upload-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传图片文件 (jpg, png, gif, webp, bmp)'), false)
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: UploadedFile) {
    try {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    // 静态资源基础 URL：CDN 优先 → STATIC_BASE_URL → API_BASE_URL
    const cdnDomain = (process.env.CDN_ENABLED === 'true' && process.env.CDN_DOMAIN)
      ? process.env.CDN_DOMAIN.replace(/\/$/, '')
      : null
    const baseUrl = cdnDomain
      || (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
    const url = `${baseUrl}/uploads/${file.filename}`
    console.log('Upload success:', file.originalname, '->', url)
    return Result.success({ url })
    } catch (error: any) {
      console.error('Upload error:', error?.message || error)
      return Result.error('文件上传失败: ' + (error?.message || '未知错误'))
    }
  }
}
