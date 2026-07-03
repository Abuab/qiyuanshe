import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { Result } from '../common/result'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CosService } from '../cos/cos.service'

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
 * 小程序端图片上传（需登录，已添加 JWT 认证）
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly cosService: CosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
  async uploadFile(@UploadedFile() file: UploadedFile, @Request() req: any) {
    try {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    // 静态资源基础 URL：CDN 优先 → STATIC_BASE_URL → API_BASE_URL
    const cdnDomain = (process.env.CDN_ENABLED === 'true' && process.env.CDN_DOMAIN)
      ? process.env.CDN_DOMAIN.replace(/\/$/, '')
      : null
    const baseUrl = cdnDomain
      || (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    // 始终返回相对路径，由 resolveAvatarUrl() 在读取时拼接当前域名
    const url = `/uploads/${file.filename}`
    // 记录上传者信息，用于后续追溯
    const uploaderId = req.user?.sub || req.user?.id || null
    console.log('Upload success:', file.originalname, '->', url, 'uploaderId:', uploaderId)

    // 双写：异步上传到 COS（不阻塞响应，失败不影响本地文件）
    if (this.cosService.isCosEnabled()) {
      const cosKey = `uploads/${file.filename}`
      this.cosService.uploadToCos(file.path, cosKey).catch((err) => {
        console.error('COS async upload failed:', err?.message || err)
      })
    }

    return Result.success({ url, uploaderId })
    } catch (error: any) {
      console.error('Upload error:', error?.message || error)
      return Result.error('文件上传失败: ' + (error?.message || '未知错误'))
    }
  }
}
