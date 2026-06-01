import { Injectable, Logger } from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'

interface CaptchaEntry {
  code: string
  timer: NodeJS.Timeout
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name)
  private captchaStore = new Map<string, CaptchaEntry>()

  generateCaptcha(): { svg: string; key: string } {
    const key = Math.random().toString(36).substring(2, 15)

    try {
      const captcha = svgCaptcha.create({
        size: 4,
        ignoreChars: '0oO1ilI',
        noise: 2,
        color: true,
        width: 120,
        height: 40,
      })

      const timer = setTimeout(() => {
        this.captchaStore.delete(key)
      }, 5 * 60 * 1000)

      this.captchaStore.set(key, { code: captcha.text.toLowerCase(), timer })
      this.logger.log(`验证码生成成功 key=${key}`)

      return { svg: captcha.data, key }
    } catch (error) {
      this.logger.warn(`svg-captcha 生成失败，降级为纯数字验证码: ${error instanceof Error ? error.message : String(error)}`)

      const fallbackCode = this.generateFallbackCode()
      const svg = this.buildFallbackSvg(fallbackCode)

      const timer = setTimeout(() => {
        this.captchaStore.delete(key)
      }, 5 * 60 * 1000)

      this.captchaStore.set(key, { code: fallbackCode.toLowerCase(), timer })
      this.logger.log(`降级验证码生成成功 key=${key}`)

      return { svg, key }
    }
  }

  verifyCaptcha(key: string, code: string): boolean {
    const entry = this.captchaStore.get(key)
    if (!entry) return false

    const isValid = entry.code === code.toLowerCase()
    if (isValid) {
      clearTimeout(entry.timer)
      this.captchaStore.delete(key)
    }

    return isValid
  }

  private generateFallbackCode(): string {
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString()
    }
    return code
  }

  private buildFallbackSvg(code: string): string {
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">',
      '  <rect width="120" height="40" fill="#f0f0f0" rx="4"/>',
      `  <text x="60" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">${code}</text>`,
      '</svg>',
    ].join('\n')
  }
}