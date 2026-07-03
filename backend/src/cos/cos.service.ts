import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import COS = require('cos-nodejs-sdk-v5')
import * as fs from 'fs'
import * as path from 'path'
import { Readable, PassThrough } from 'stream'
import { UserNotification } from '../entities/UserNotification'

/** COS 健康状态 */
export type CosHealthStatus = 'healthy' | 'unhealthy' | 'disabled' | 'unknown'

/** 图片服务模式 */
export type ImageServeMode = 'cos' | 'local'

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name)
  private cosClient: COS | null = null
  private enabled = false

  /** 当前 COS 健康状态 */
  private healthStatus: CosHealthStatus = 'unknown'
  /** 上一次图片代理的服务模式（用于检测切换） */
  private lastServeMode: ImageServeMode | null = null
  /** 健康检查定时器 */
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  /** 连续失败次数（用于避免抖动） */
  private consecutiveFailures = 0
  /** 健康检查开关 */
  private static readonly HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 分钟
  /** 切换通知冷却时间（避免频繁通知） */
  private static readonly NOTIFY_COOLDOWN_MS = 10 * 60 * 1000 // 10 分钟
  private lastNotifyTime = 0

  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepo: Repository<UserNotification>,
  ) {
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
      this.logger.log('[COS 状态] COS_ENABLED=false，COS 客户端未初始化，使用本地存储模式。')
      this.enabled = false
      this.healthStatus = 'disabled'
      this.stopHealthCheck()
      return
    }

    if (!secretId || !secretKey) {
      this.logger.warn(
        '[COS 状态] COS_ENABLED=true 但 COS_SECRET_ID 或 COS_SECRET_KEY 缺失。' +
        'COS 客户端未初始化，降级为本地存储模式。',
      )
      this.enabled = false
      this.healthStatus = 'disabled'
      this.stopHealthCheck()
      return
    }

    try {
      this.cosClient = new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      })
      this.enabled = true
      this.healthStatus = 'unknown'
      this.consecutiveFailures = 0
      this.logger.log('[COS 状态] COS 客户端初始化成功，即将执行健康检查...')
      this.startHealthCheck()
    } catch (error: any) {
      this.logger.error(`[COS 状态] COS 客户端初始化失败: ${error?.message || error}`)
      this.enabled = false
      this.cosClient = null
      this.healthStatus = 'unhealthy'
    }
  }

  /**
   * 启动定时健康检查。
   */
  private startHealthCheck(): void {
    this.stopHealthCheck()
    // 首次立即检查
    this.performHealthCheck()
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      CosService.HEALTH_CHECK_INTERVAL_MS,
    )
    this.logger.log(`[COS 健康检查] 已启动，间隔=${CosService.HEALTH_CHECK_INTERVAL_MS / 1000}s`)
  }

  /**
   * 停止健康检查。
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
      this.logger.log('[COS 健康检查] 已停止')
    }
  }

  /**
   * 执行单次健康检查：尝试 HEAD Bucket。
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isCosEnabled()) {
      this.healthStatus = 'disabled'
      return
    }

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.transitionToUnhealthy('COS Bucket 或 Region 未配置')
      return
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.cosClient!.headBucket(
          { Bucket: config.Bucket, Region: config.Region },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })

      // 健康检查通过
      this.consecutiveFailures = 0
      if (this.healthStatus !== 'healthy') {
        this.logger.log('[COS 状态] 健康检查通过 - COS 服务可用')
        this.transitionToHealthy()
      } else {
        this.logger.log('[COS 健康检查] 通过')
      }
    } catch (error: any) {
      this.consecutiveFailures++
      const errMsg = error?.message || String(error)
      this.logger.warn(`[COS 健康检查] 失败 (连续 ${this.consecutiveFailures} 次): ${errMsg}`)

      // 连续失败 2 次才标记为 unhealthy，避免网络瞬时抖动
      if (this.consecutiveFailures >= 2 && this.healthStatus === 'healthy') {
        this.transitionToUnhealthy(errMsg)
      }
    }
  }

  /**
   * 状态变为健康。
   */
  private transitionToHealthy(): void {
    const previous = this.healthStatus
    this.healthStatus = 'healthy'
    // 从 unhealthy/unknown 恢复时发送通知
    if (previous !== 'healthy') {
      this.sendNotify(
        'COS 服务已恢复',
        `COS 对象存储服务已恢复正常。\nBucket: ${process.env.COS_BUCKET || '-'}\nRegion: ${process.env.COS_REGION || '-'}\n时刻: ${new Date().toLocaleString('zh-CN')}`,
      )
    }
  }

  /**
   * 状态变为不健康。
   */
  private transitionToUnhealthy(reason: string): void {
    const previous = this.healthStatus
    this.healthStatus = 'unhealthy'
    if (previous === 'healthy' || previous === 'unknown') {
      this.sendNotify(
        'COS 服务不可用',
        `COS 对象存储服务不可用，已自动降级为本地存储。\n原因: ${reason}\nBucket: ${process.env.COS_BUCKET || '-'}\n时刻: ${new Date().toLocaleString('zh-CN')}`,
      )
    }
  }

  /**
   * 检测图片服务模式是否发生切换，并记录日志 / 发送通知。
   */
  private trackServeModeSwitch(mode: ImageServeMode, key?: string): void {
    if (this.lastServeMode !== null && this.lastServeMode !== mode) {
      const msg = `[存储切换] 图片服务从 ${this.lastServeMode.toUpperCase()} 切换为 ${mode.toUpperCase()}` +
        (key ? ` (触发 key="${key}")` : '')
      this.logger.warn(msg)

      // 冷却期内不重复发送通知
      const now = Date.now()
      if (now - this.lastNotifyTime > CosService.NOTIFY_COOLDOWN_MS) {
        this.lastNotifyTime = now
        this.sendNotify(
          '存储模式切换',
          `图片服务模式已切换: ${this.lastServeMode.toUpperCase()} → ${mode.toUpperCase()}` +
          `\n时刻: ${new Date().toLocaleString('zh-CN')}`,
        )
      }
    }
    this.lastServeMode = mode
  }

  /**
   * 发送通知：写入 UserNotification 表并记录日志。
   */
  private async sendNotify(title: string, content: string): Promise<void> {
    this.logger.warn(`[COS 通知] ${title}: ${content.replace(/\n/g, ' | ')}`)

    try {
      // 通知系统主用户（users 表 ID 1，外键约束要求）
      // user_notifications.userId 必须引用 users.id，不能引用 admin_users.id
      const adminIds: number[] = [1]

      for (const adminId of adminIds) {
        await this.notificationRepo.save(
          this.notificationRepo.create({
            userId: adminId,
            title,
            content,
            senderType: 'system',
          }),
        )
      }

      this.logger.log(`[COS 通知] 已向主用户发送通知: "${title}"`)
    } catch (error: any) {
      this.logger.error(`[COS 通知] 写入失败: ${error?.message || error}`)
    }

    // 同时尝试调用 webhook（如果配置了）
    await this.tryWebhookNotify(title, content)
  }

  /**
   * 尝试通过 webhook 发送通知（兼容 NotifyChannelService 的 webhook URL 配置）。
   */
  private async tryWebhookNotify(title: string, content: string): Promise<void> {
    try {
      const notifyEnabled = process.env.COS_NOTIFY_WEBHOOK_URL
      if (!notifyEnabled) return

      const webhookUrls = notifyEnabled
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean)

      for (const url of webhookUrls) {
        try {
          await this.sendSingleWebhook(url, title, content)
        } catch (e: any) {
          this.logger.warn(`[COS Webhook] 发送失败 (${url}): ${e?.message || e}`)
        }
      }
    } catch (error: any) {
      this.logger.debug(`[COS Webhook] 配置缺失或发送异常: ${error?.message || error}`)
    }
  }

  /**
   * 发送单条 webhook 消息（Markdown 格式，兼容企微机器人）。
   */
  private async sendSingleWebhook(
    url: string,
    title: string,
    content: string,
  ): Promise<void> {
    const https = require('https')
    const { URL } = require('url')
    const parsed = new URL(url)

    const body = JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        content: `## ${title}\n${content}\n> 系统: 亲缘社后端\n> 时间: ${new Date().toLocaleString('zh-CN')}`,
      },
    })

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        },
        (res: any) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log('[COS Webhook] 发送成功')
            resolve()
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        },
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  /**
   * 检查 COS 是否已启用且客户端可用。
   */
  isCosEnabled(): boolean {
    return this.enabled && this.cosClient !== null
  }

  /**
   * 获取当前 COS 健康状态。
   */
  getHealthStatus(): CosHealthStatus {
    return this.healthStatus
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
            if (err) reject(err)
            else resolve(data)
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
            if (err) reject(err)
            else resolve()
          },
        )
      })

      this.logger.log(`[COS 上传] 成功: ${localPath} → ${key}`)
    } catch (error: any) {
      // 上传失败记录日志，但不抛异常 —— 本地文件已保存，COS 可后续补偿同步
      this.logger.error(
        `[COS 上传] 失败: key="${key}" (localPath="${localPath}"): ${error?.message || error}`,
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
            if (err) reject(err)
            else resolve()
          },
        )
      })

      this.logger.log(`[COS 删除] 成功: ${key}`)
    } catch (error: any) {
      this.logger.error(
        `[COS 删除] 失败: key="${key}": ${error?.message || error}`,
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
   * 从 COS 获取图片文件流（代理模式，避免 302 重定向在小程序端失效）。
   * 使用 PassThrough 流式传输，避免将整张图片加载进内存导致 OOM。
   * @param key - COS 对象 Key
   * @returns { stream: Readable, contentType: string } 或 null
   */
  getImageFromCos(key: string): { stream: Readable; contentType: string } | null {
    if (!this.isCosEnabled()) {
      this.trackServeModeSwitch('local', key)
      return null
    }

    const config = this.getConfig()
    if (!config.Bucket || !config.Region) {
      this.logger.warn('[COS 代理] Bucket 或 Region 未配置，无法代理图片。')
      this.trackServeModeSwitch('local', key)
      return null
    }

    const passThrough = new PassThrough()
    const contentType = this.getContentTypeByExt(key) || 'application/octet-stream'

    // 预绑定 error 处理，防止未监听的 error 事件导致进程崩溃
    passThrough.on('error', (err: Error) => {
      this.logger.error(`[COS 代理] Stream error for key="${key}": ${err?.message || err}`)
    })

    this.cosClient!.getObject(
      {
        Bucket: config.Bucket,
        Region: config.Region,
        Key: key,
        Output: passThrough,
      },
      (err) => {
        if (err) {
          const errMsg = (err as any)?.message || String(err)
          this.logger.error(`[COS 代理] getObject 失败: key="${key}": ${errMsg}`)
          passThrough.destroy(new Error(errMsg))
          this.trackServeModeSwitch('local', key)
        }
      },
    )

    this.trackServeModeSwitch('cos', key)
    return { stream: passThrough, contentType }
  }

  /**
   * 从本地磁盘读取图片文件流（代理降级）。
   * 使用 createReadStream 流式读取，避免大文件 OOM。
   */
  getImageFromLocal(key: string): { stream: Readable; contentType: string } | null {
    const uploadDir = this.getLocalUploadPath()
    // key 格式: uploads/xxx.jpg，去掉前缀后拼接到上传目录
    const relativePath = key.startsWith('uploads/') ? key.slice('uploads/'.length) : key
    const filePath = path.join(uploadDir, relativePath)

    // 二次安全校验：确保最终路径在 uploadDir 内
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      this.logger.warn(`[COS 本地] 路径穿越拦截: key="${key}" -> "${resolvedPath}"`)
      return null
    }

    if (!fs.existsSync(resolvedPath)) {
      this.logger.warn(`[COS 本地] 文件不存在: ${filePath}`)
      return null
    }

    const stream = fs.createReadStream(resolvedPath)
    const contentType = this.getContentTypeByExt(key) || 'application/octet-stream'
    this.trackServeModeSwitch('local', key)
    return { stream, contentType }
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

  /**
   * 应用关闭时清理。
   */
  onModuleDestroy(): void {
    this.stopHealthCheck()
  }
}
