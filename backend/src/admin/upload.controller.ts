import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import sharp from 'sharp'
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

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']

/** 语音文件 MIME → 扩展名映射（与 user.controller.ts 保持一致） */
const VOICE_MIME_EXT: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/x-m4a': '.m4a',
  'audio/m4a': '.m4a',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/x-aac': '.aac',
  'audio/aacp': '.aac',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
}

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

ensureDirectoryExists(uploadsDir)

@Controller('admin/upload')
@UseGuards(AdminJwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

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
    const url = `/uploads/${file.filename}`

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

    return Result.success({ url, compressedUrl })
  }

  @Post('voice')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          const ext = VOICE_MIME_EXT[file.mimetype] || '.mp3'
          cb(null, `voice-${uniqueSuffix}${ext}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB
      },
      fileFilter: (_req, file, cb) => {
        if (VOICE_MIME_EXT[file.mimetype]) {
          cb(null, true)
        } else {
          cb(new Error('只允许上传语音文件'), false)
        }
      },
    }),
  )
  async uploadVoiceFile(@UploadedFile() file: UploadedFile) {
    if (!file) {
      return Result.error('请选择要上传的语音文件')
    }
    const url = `/uploads/${file.filename}`
    return Result.success({ url })
  }
}
