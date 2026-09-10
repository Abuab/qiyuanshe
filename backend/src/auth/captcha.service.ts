import { Injectable } from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'
import { randomBytes } from 'crypto'
import { RedisService } from '../common/redis.service'

/**
 * 自建图形验证码服务（不依赖第三方）。
 *
 * - 5 位字符，剔除易混淆字符（0/O、1/l/I、2/Z、5/S、8/B）
 * - 答案仅存于 Redis（`captcha:code:{id}`），前端永远拿不到明文
 * - 连续校验错误 3 次强制作废，需重新刷新
 */
@Injectable()
export class CaptchaService {
  private static readonly TTL_SECONDS = 120
  private static readonly MAX_FAILS = 3

  constructor(private readonly redis: RedisService) {}

  /** 生成图形验证码，返回 base64 SVG 图片与验证码 id */
  async create(): Promise<{ captchaId: string; imageBase64: string }> {
    const captcha = svgCaptcha.create({
      size: 5,
      noise: 3,
      color: true,
      ignoreChars: '0oO1ilI2Z5S8B',
      background: '#f0f2f5',
      width: 150,
      height: 50,
      fontSize: 48,
    })

    const captchaId = randomBytes(16).toString('hex')
    const code = captcha.text.toLowerCase()
    await this.redis.set(`captcha:code:${captchaId}`, code, CaptchaService.TTL_SECONDS)

    const imageBase64 = Buffer.from(captcha.data, 'utf8').toString('base64')
    return { captchaId, imageBase64 }
  }

  /** 校验图形验证码，成功即作废；连续错误 3 次强制刷新 */
  async verify(captchaId: string, code: string): Promise<boolean> {
    const codeKey = `captcha:code:${captchaId}`
    const failKey = `captcha:fail:${captchaId}`

    const stored = await this.redis.get(codeKey)
    if (!stored) return false

    const matched = stored === (code || '').trim().toLowerCase()
    if (matched) {
      await this.redis.del(codeKey)
      await this.redis.del(failKey)
      return true
    }

    const fails = await this.redis.incrWithTtl(failKey, 300)
    if (fails >= CaptchaService.MAX_FAILS) {
      await this.redis.del(codeKey)
      await this.redis.del(failKey)
    }
    return false
  }
}
