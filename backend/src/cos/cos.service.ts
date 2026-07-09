import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name)

  /**
   * 从本地磁盘读取图片文件流。
   * 使用 createReadStream 流式读取，避免大文件 OOM。
   */
  getImageFromLocal(key: string): { stream: Readable; contentType: string } | null {
    const uploadDir = this.getLocalUploadPath()
    // key 格式: uploads/xxx.jpg，去掉前缀后拼接到上传目录
    const relativePath = key.startsWith('uploads/') ? key.slice('uploads/'.length) : key
    const filePath = path.join(uploadDir, relativePath)

    // 安全校验：确保最终路径在 uploadDir 内
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      this.logger.warn(`[图片代理] 路径穿越拦截: key="${key}" -> "${resolvedPath}"`)
      return null
    }

    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`[图片代理] 文件不存在: ${filePath}`)
      return null
    }

    const stream = fs.createReadStream(resolvedPath)
    const contentType = this.getContentTypeByExt(key) || 'application/octet-stream'
    return { stream, contentType }
  }

  /**
   * 获取本地上传目录的绝对路径。
   */
  getLocalUploadPath(): string {
    return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  }

  /**
   * 根据文件扩展名获取 MIME 类型。
   */
  private getContentTypeByExt(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    }
    return mimeMap[ext] || null
  }
}
