import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
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

@Controller('admin/upload')
@UseGuards(AdminJwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `upload-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
  async uploadFile(@UploadedFile() file: UploadedFile) {
    if (!file) {
      return Result.error('请选择要上传的文件')
    }
    return Result.success({ url: `/uploads/${file.filename}` })
  }

  @Post('cert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/cert',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, `cert-${uniqueSuffix}${extname(file.originalname)}`)
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 5,
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
