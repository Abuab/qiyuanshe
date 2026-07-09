import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { CosService } from './cos.service'
import { Logger } from '@nestjs/common'

/**
 * 图片安全 Key 格式校验正则：
 * - 必须以 uploads/ 开头
 * - 只允许字母、数字、下划线、连字符、点、斜线
 * - 禁止 ..（路径穿越）和绝对路径（以 / 开头的不符合 uploads/ 前缀）
 */
const SAFE_KEY_REGEX = /^uploads\/[a-zA-Z0-9_\-.]+(?:\/[a-zA-Z0-9_\-.]+)*$/

@Controller('cos/image')
export class CosController {
  private readonly logger = new Logger(CosController.name)

  constructor(private readonly cosService: CosService) {}

  /**
   * 图片读取接口：从本地磁盘流式返回图片数据。
   *
   * GET /api/cos/image?key=uploads/avatar/123.jpg
   * - 无需认证（公开读取，适配小程序 <image> 组件无法携带自定义头及游客模式）
   * - key 格式严格校验（防路径穿越）
   * - 仅从本地磁盘读取（已移除 COS SDK 图片代理以避免内存泄漏导致 OOM）
   */
  @Get()
  async getImage(@Query('key') key: string, @Res() res: Response) {
    // 1. 校验 key 存在且格式安全
    if (!key || typeof key !== 'string') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        code: 400,
        message: '参数 key 缺失或格式不正确',
      })
    }

    // 2. 严格正则校验：防路径穿越，只允许 uploads/ 前缀
    if (!SAFE_KEY_REGEX.test(key)) {
      this.logger.warn(`Rejected unsafe key: "${key}"`)
      return res.status(HttpStatus.FORBIDDEN).json({
        code: 403,
        message: '非法的图片路径',
      })
    }

    // 3. 二次校验：显式拒绝 .. 和绝对路径（兜底）
    if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      this.logger.warn(`Rejected path traversal attempt: "${key}"`)
      return res.status(HttpStatus.FORBIDDEN).json({
        code: 403,
        message: '非法的图片路径',
      })
    }

    // 4. 从本地磁盘流式读取（不经过 COS SDK，避免 passThrough 内存泄漏）
    const localResult = this.cosService.getImageFromLocal(key)
    if (localResult) {
      res.setHeader('Content-Type', localResult.contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      localResult.stream.on('error', (err: Error) => {
        if (err?.message === 'client disconnected') return
        this.logger.error(`Local stream error for key="${key}": ${err.message}`)
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ code: 500, message: '图片加载失败' })
        } else {
          res.end()
        }
      })
      // 客户端提前断开时销毁文件读取流，释放文件句柄与缓冲
      res.once('close', () => {
        if (!res.writableFinished && !localResult.stream.destroyed) {
          localResult.stream.destroy()
        }
      })
      localResult.stream.pipe(res)
      return
    }

    // 5. 本地文件也不存在
    return res.status(HttpStatus.NOT_FOUND).json({
      code: 404,
      message: '图片不存在',
    })
  }
}
