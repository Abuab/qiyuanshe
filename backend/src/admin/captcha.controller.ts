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

@Controller()
export class CaptchaFallbackController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get('captcha')
  async getCaptchaFallback() {
    const { svg, key } = this.captchaService.generateCaptcha()
    return { svg, key }
  }
}

@Controller('api')
export class CaptchaApiController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get('captcha')
  async getCaptchaApi() {
    const { svg, key } = this.captchaService.generateCaptcha()
    return { svg, key }
  }

  @Get('admin/captcha')
  async getCaptchaApiAdmin() {
    const { svg, key } = this.captchaService.generateCaptcha()
    return { svg, key }
  }
}