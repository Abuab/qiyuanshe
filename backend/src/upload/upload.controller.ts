import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import sharp from 'sharp'
import { Result } from '../common/result'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

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
  private readonly logger = new Logger(UploadController.name)

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
    const url = `/uploads/${file.filename}`
    // 记录上传者信息，用于后续追溯
    const uploaderId = req.user?.sub || req.user?.id || null

    // 用 sharp 压缩生成 750x400 封面图
    let compressedUrl = url
    try {
      const ext = extname(file.filename)
      const baseName = file.filename.replace(ext, '')
      const compressedFilename = `${baseName}_750x400${ext}`
      const compressedPath = join(uploadsDir, compressedFilename)
      await sharp(file.path)
        .resize(750, 400, { fit: 'cover', position: 'center' })
        .toFile(compressedPath)
      compressedUrl = `/uploads/${compressedFilename}`
      this.logger.log(`Image compressed: ${compressedFilename}`)
    } catch (e: any) {
      this.logger.error(`Image compression failed: ${e?.message || e}, fallback to original`)
    }

    this.logger.log(`Upload success: ${file.originalname} -> ${url} uploaderId=${uploaderId || 'anonymous'} compressedUrl=${compressedUrl}`)

    return Result.success({ url, compressedUrl, uploaderId })
    } catch (error: any) {
      this.logger.error(`Upload error: ${error?.message || error}`)
      return Result.error('文件上传失败: ' + (error?.message || '未知错误'))
    }
  }
}
