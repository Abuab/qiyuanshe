import { Controller, Get, Query, Res, UseGuards, Req, HttpStatus } from '@nestjs/common'
import { Response, Request } from 'express'
import { CosService } from './cos.service'
import { OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JwtService } from '@nestjs/jwt'
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

  constructor(
    private readonly cosService: CosService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 图片读取接口：代理返回图片数据（适配小程序不支持 302 重定向到外部域名）。
   *
   * GET /api/cos/image?key=uploads/avatar/123.jpg&token=<jwt>
   * - 认证方式（两种之一即可）：
   *   a. Authorization: Bearer <token> 请求头（web 端 fetch 自动携带）
   *   b. ?token=<jwt> 查询参数（uni-app <image> 组件无法发送自定义头时使用）
   * - key 格式严格校验（防路径穿越）
   * - COS 可用 → 从 COS 获取并以流返回
   * - COS 不可用 → 从本地磁盘读取返回
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getImage(
    @Query('key') key: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // 1. 认证校验：优先从 JWT guard (Authorization header)，回退到 ?token= 查询参数
    const userFromGuard = (req as any).user
    let userId: number | null = null

    if (userFromGuard && userFromGuard.sub) {
      userId = userFromGuard.sub
    } else if (token && typeof token === 'string') {
      try {
        const payload = this.jwtService.verify(token)
        // 接受 access token（15min）和 refresh token（7d），
        // 因为图片 URL 嵌入在页面中无法随 access token 自动刷新
        if (payload && payload.sub && (payload.type === 'access' || payload.type === 'refresh')) {
          userId = payload.sub
        }
      } catch {
        // token 无效，继续返回 401
      }
    }

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        code: 401,
        message: '请先登录',
      })
    }

    // 2. 校验 key 存在且格式安全
    if (!key || typeof key !== 'string') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        code: 400,
        message: '参数 key 缺失或格式不正确',
      })
    }

    // 3. 严格正则校验：防路径穿越，只允许 uploads/ 前缀
    if (!SAFE_KEY_REGEX.test(key)) {
      this.logger.warn(`Rejected unsafe key: "${key}"`)
      return res.status(HttpStatus.FORBIDDEN).json({
        code: 403,
        message: '非法的图片路径',
      })
    }

    // 4. 二次校验：显式拒绝 .. 和绝对路径（兜底）
    if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
      this.logger.warn(`Rejected path traversal attempt: "${key}"`)
      return res.status(HttpStatus.FORBIDDEN).json({
        code: 403,
        message: '非法的图片路径',
      })
    }

    // 5. 尝试从 COS 代理获取（流式传输，避免 OOM）
    if (this.cosService.isCosEnabled()) {
      const result = this.cosService.getImageFromCos(key)
      if (result) {
        this.logger.log(`COS proxy streaming for key="${key}"`)
        res.setHeader('Content-Type', result.contentType)
        res.setHeader('Cache-Control', 'public, max-age=86400')
        result.stream.on('error', (err: Error) => {
          this.logger.error(`COS stream error for key="${key}": ${err.message}`)
          if (!res.headersSent) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ code: 500, message: '图片加载失败' })
          } else {
            res.end()
          }
        })
        result.stream.pipe(res)
        return
      }
    }

    // 6. 降级：从本地磁盘流式读取
    const localResult = this.cosService.getImageFromLocal(key)
    if (localResult) {
      this.logger.log(`Local file streaming for key="${key}"`)
      res.setHeader('Content-Type', localResult.contentType)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      localResult.stream.on('error', (err: Error) => {
        this.logger.error(`Local stream error for key="${key}": ${err.message}`)
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ code: 500, message: '图片加载失败' })
        } else {
          res.end()
        }
      })
      localResult.stream.pipe(res)
      return
    }

    // 7. 彻底失败
    return res.status(HttpStatus.NOT_FOUND).json({
      code: 404,
      message: '图片不存在',
    })
  }
}
