import { Injectable } from '@nestjs/common'
import * as svgCaptcha from 'svg-captcha'

@Injectable()
export class CaptchaService {
  private captchaStore = new Map<string, string>()

  generateCaptcha(): { svg: string; key: string } {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0oO1ilI',
      noise: 2,
      color: true,
      width: 120,
      height: 40,
    })

    const key = Math.random().toString(36).substring(2, 15)
    this.captchaStore.set(key, captcha.text.toLowerCase())

    setTimeout(() => {
      this.captchaStore.delete(key)
    }, 5 * 60 * 1000)

    return { svg: captcha.data, key }
  }

  verifyCaptcha(key: string, code: string): boolean {
    const storedCode = this.captchaStore.get(key)
    if (!storedCode) return false

    const isValid = storedCode === code.toLowerCase()
    if (isValid) {
      this.captchaStore.delete(key)
    }

    return isValid
  }
}