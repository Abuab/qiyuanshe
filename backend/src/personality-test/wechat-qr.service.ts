import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../common/redis.service'
import { SystemService } from '../system/system.service'
import { wechatConfig } from '../config/wechat'

/**
 * 微信小程序码生成服务
 *
 * - 通过 wxacode.getUnlimited 生成「不限量」小程序码（扫码可直达小程序指定页面）
 * - access_token 使用 Redis 跨进程缓存（微信有获取频次限制）
 * - 目标页面 / 环境版本可在管理后台系统配置的 share 分组自定义：
 *   share.qrPage        默认 pages/personality/result
 *   share.qrEnvVersion  默认 release（可选 trial / develop，未发布小程序时用）
 * - 任一环节失败均返回 null，由调用方回退为普通链接二维码，保证海报始终有码
 */
@Injectable()
export class WechatQrService {
  private readonly logger = new Logger(WechatQrService.name)
  private static readonly TOKEN_KEY = 'wechat:access_token'

  constructor(
    private readonly redis: RedisService,
    private readonly systemService: SystemService,
  ) {}

  /** 获取并缓存微信全局 access_token */
  private async getAccessToken(): Promise<string | null> {
    if (!wechatConfig.appId || !wechatConfig.secret) return null
    const cached = await this.redis.get(WechatQrService.TOKEN_KEY).catch(() => null)
    if (cached) return cached
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatConfig.appId}&secret=${wechatConfig.secret}`
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
      const data: any = await resp.json()
      if (data?.access_token) {
        // 微信 expires_in 通常 7200s，提前 300s 过期以留出余量
        const ttl = Math.max(60, (data.expires_in || 7200) - 300)
        await this.redis.set(WechatQrService.TOKEN_KEY, data.access_token, ttl).catch(() => {})
        return data.access_token
      }
      this.logger.warn(`获取 access_token 失败: ${JSON.stringify(data)}`)
      return null
    } catch (e: any) {
      this.logger.warn(`获取 access_token 异常: ${e?.message}`)
      return null
    }
  }

  /**
   * 生成小程序码 PNG buffer；失败返回 null（调用方回退普通二维码）
   * @param scene 场景参数（≤32 字符，字符集受限），如 i=123 用于追踪邀请人
   * @param pageOverride 指定小程序码打开的页面，不传则用系统配置 share.qrPage
   */
  async getMiniProgramCode(scene: string, pageOverride?: string): Promise<Buffer | null> {
    const token = await this.getAccessToken()
    if (!token) return null
    const page = pageOverride || (await this.systemService.getConfig('share.qrPage')) || 'pages/personality/result'
    const envVersion = (await this.systemService.getConfig('share.qrEnvVersion')) || 'release'
    try {
      const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`
      const body = {
        scene: (scene || '').slice(0, 32),
        page,
        width: 280,
        // 关闭路径校验，未发布/试用版也能生成，避免 "page not exist" 报错
        check_path: false,
        env_version: envVersion,
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      })
      // 成功返回二进制图片；失败返回 JSON { errcode, errmsg }
      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const err = await resp.json().catch(() => ({}))
        this.logger.warn(`生成小程序码失败: ${JSON.stringify(err)}`)
        return null
      }
      const arrayBuf = await resp.arrayBuffer()
      return Buffer.from(arrayBuf)
    } catch (e: any) {
      this.logger.warn(`生成小程序码异常: ${e?.message}`)
      return null
    }
  }
}
