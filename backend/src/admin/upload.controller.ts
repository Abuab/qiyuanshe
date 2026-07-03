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

const ensureDirectoryExists = (dir: string) => {
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch (_) {
      // bind mount 下权限不足时静默失败，不阻塞进程启动
    }
  }
}

const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const certDir = join(uploadsDir, 'cert')

ensureDirectoryExists(uploadsDir)
ensureDirectoryExists(certDir)

@Controller('admin/upload')
@UseGuards(AdminJwtAuthGuard)
export class UploadController {
  constructor(private readonly cosService: CosService) {}

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
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    // 静态资源基础 URL：CDN 优先 → STATIC_BASE_URL → API_BASE_URL
    const cdnDomain = (process.env.CDN_ENABLED === 'true' && process.env.CDN_DOMAIN)
      ? process.env.CDN_DOMAIN.replace(/\/$/, '')
      : null
    const baseUrl = cdnDomain
      || (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    const url = `/uploads/${file.filename}`

    // 双写：异步上传到 COS（不阻塞响应，失败不影响本地文件）
    if (this.cosService.isCosEnabled()) {
      const cosKey = `uploads/${file.filename}`
      this.cosService.uploadToCos(file.path, cosKey).catch((err) => {
        console.error('Admin COS async upload failed:', err?.message || err)
      })
    }

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
        const ext = extname(file.originalname).toLowerCase()
        if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传图片文件 (jpg, png, gif, webp, bmp)'), false)
        }
      },
    }),
  )
  async uploadCert(@UploadedFile() file: UploadedFile) {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    const path = `/uploads/cert/${file.filename}`

    // 双写：异步上传到 COS
    if (this.cosService.isCosEnabled()) {
      const cosKey = `uploads/cert/${file.filename}`
      this.cosService.uploadToCos(file.path, cosKey).catch((err) => {
        console.error('Admin cert COS async upload failed:', err?.message || err)
      })
    }

    return Result.success({ path })
  }
}
