import { Injectable, Logger } from '@nestjs/common'
import COS = require('cos-nodejs-sdk-v5')
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name)
  private cosClient: COS | null = null
  private enabled = false

  constructor() {
    this.initClient()
  }

  /**
   * 初始化 COS 客户端。当 COS_ENABLED=true 且密钥配置完整时初始化，
   * 否则不创建客户端实例，后续所有方法调用将优雅降级。
   */
  private initClient(): void {
    const cosEnabled = process.env.COS_ENABLED === 'true'
    const secretId = process.env.COS_SECRET_ID
    const secretKey = process.env.COS_SECRET_KEY

    if (!cosEnabled) {
      this.logger.log('COS_ENABLED is false, COS client will not be initialized. Using local-only mode.')
      this.enabled = false
      return
    }

    if (!secretId || !secretKey) {
      this.logger.warn(
        'COS_ENABLED is true but COS_SECRET_ID or COS_SECRET_KEY is missing. ' +
        'COS client will not be initialized. Falling back to local-only mode.',
      )
      this.enabled = false
      return
    }

    try {
      this.cosClient = new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      })
      this.enabled = true
      this.logger.log('COS client initialized successfully.')
    } catch (error: any) {
      this.logger.error(`Failed to initialize COS client: ${error?.message || error}`)
      this.enabled = false
      this.cosClient = null
    }
  }

  /**
   * 检查 COS 是否已启用且客户端可用。
   */
  isCosEnabled(): boolean {
    return this.enabled && this.cosClient !== null
  }

  /**
   * 获取 COS 配置信息（不含密钥）。
   */
  private getConfig() {
    return {
      Bucket: process.env.COS_BUCKET || '',
      Region: process.env.COS_REGION || '',
      Domain: (process.env.COS_DOMAIN || '').replace(/\/$/, ''),
      SignExpires: parseInt(process.env.COS_SIGN_EXPIRES || '1800', 10),
    }
  }

  /**
   * 生成 COS 签名 URL。
   * @param key - COS 对象 Key（如 uploads/avatar/123.jpg）
   * @returns 签名后的完整 URL，失败返回 null
   */
  async generateSignedUrl(key: string): Promise<string | null> {
    if (!this.isCosEnabled()) {
      return null
    }

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.logger.warn('COS Bucket or Region not configured, cannot generate signed URL.')
      return null
    }

    try {
      const result = await new Promise<{ Url: string }>((resolve, reject) => {
        this.cosClient!.getObjectUrl(
          {
            Bucket: config.Bucket,
            Region: config.Region,
            Key: key,
            Sign: true,
            Expires: config.SignExpires,
          },
          (err, data) => {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          },
        )
      })

      return result.Url
    } catch (error: any) {
      this.logger.error(
        `Failed to generate signed URL for key="${key}": ${error?.message || error}`,
      )
      return null
    }
  }

  /**
   * 上传本地文件到 COS。
   * @param localPath - 本地文件绝对路径
   * @param key - COS 对象 Key（如 uploads/avatar/123.jpg）
   */
  async uploadToCos(localPath: string, key: string): Promise<void> {
    if (!this.isCosEnabled()) {
      return
    }

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.logger.warn('COS Bucket or Region not configured, skipping upload.')
      return
    }

    // 校验本地文件存在
    if (!fs.existsSync(localPath)) {
      this.logger.error(`Local file not found: ${localPath}, skipping COS upload.`)
      return
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.cosClient!.putObject(
          {
            Bucket: config.Bucket,
            Region: config.Region,
            Key: key,
            Body: fs.createReadStream(localPath),
            ContentLength: fs.statSync(localPath).size,
          },
          (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          },
        )
      })

      this.logger.log(`COS upload success: ${localPath} -> ${key}`)
    } catch (error: any) {
      // 上传失败记录日志，但不抛异常 —— 本地文件已保存，COS 可后续补偿同步
      this.logger.error(
        `COS upload failed for key="${key}" (localPath="${localPath}"): ${error?.message || error}`,
      )
    }
  }

  /**
   * 从 COS 中删除文件。
   * @param key - COS 对象 Key
   */
  async deleteFromCos(key: string): Promise<void> {
    if (!this.isCosEnabled()) {
      return
    }

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.logger.warn('COS Bucket or Region not configured, skipping delete.')
      return
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.cosClient!.deleteObject(
          {
            Bucket: config.Bucket,
            Region: config.Region,
            Key: key,
          },
          (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          },
        )
      })

      this.logger.log(`COS delete success: ${key}`)
    } catch (error: any) {
      this.logger.error(
        `COS delete failed for key="${key}": ${error?.message || error}`,
      )
    }
  }

  /**
   * 获取本地文件访问 URL（降级用）。
   * 使用 API_BASE_URL 或 STATIC_BASE_URL 拼接本地路径。
   */
  getLocalFallbackUrl(key: string): string {
    const baseUrl = (process.env.STATIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')
    // key 格式为 "uploads/avatar/123.jpg"，直接拼接
    const normalizedKey = key.startsWith('/') ? key : `/${key}`
    if (!baseUrl) {
      return normalizedKey
    }
    return `${baseUrl}${normalizedKey}`
  }

  /**
   * 获取本地上传目录的绝对路径。
   */
  getLocalUploadPath(): string {
    return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  }

  /**
   * 从 COS 获取图片文件数据（代理模式，避免 302 重定向在小程序端失效）。
   * @param key - COS 对象 Key
   * @returns { data: Buffer, contentType: string } 或 null
   */
  async getImageFromCos(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    if (!this.isCosEnabled()) return null

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.logger.warn('COS Bucket or Region not configured, cannot proxy image.')
      return null
    }

    try {
      const result = await new Promise<{ Body: Buffer; headers: Record<string, string> }>(
        (resolve, reject) => {
          this.cosClient!.getObject(
            {
              Bucket: config.Bucket,
              Region: config.Region,
              Key: key,
            },
            (err, data) => {
              if (err) reject(err)
              else resolve(data as any)
            },
          )
        },
      )

      const contentType =
        result.headers?.['content-type'] ||
        this.getContentTypeByExt(key) ||
        'application/octet-stream'

      return { data: result.Body, contentType }
    } catch (error: any) {
      this.logger.error(`COS getObject failed for key="${key}": ${error?.message || error}`)
      return null
    }
  }

  /**
   * 从本地磁盘读取图片文件（代理降级）。
   */
  getImageFromLocal(key: string): { data: Buffer; contentType: string } | null {
    const uploadDir = this.getLocalUploadPath()
    // key 格式: uploads/xxx.jpg，去掉前缀后拼接到上传目录
    const relativePath = key.startsWith('uploads/') ? key.slice('uploads/'.length) : key
    const filePath = path.join(uploadDir, relativePath)

    // 二次安全校验：确保最终路径在 uploadDir 内
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      this.logger.warn(`Path traversal blocked: key="${key}" -> "${resolvedPath}"`)
      return null
    }

    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`Local file not found: ${filePath}`)
      return null
    }

    const data = fs.readFileSync(resolvedPath)
    const contentType = this.getContentTypeByExt(key) || 'application/octet-stream'
    return { data, contentType }
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
