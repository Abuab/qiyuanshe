import { Controller, Get } from '@nestjs/common'
import { CaptchaService } from './captcha.service'

@Controller('admin')
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get('captcha')
  async getCaptcha() {
    const { svg, key } = this.captchaService.generateCaptcha()
    return { svg, key }
  }
}