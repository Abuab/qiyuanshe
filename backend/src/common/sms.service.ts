import { Injectable, Logger } from '@nestjs/common'
import { smsConfig, isSmsConfigured } from '../config/sms'
import { callTencentApi } from '../eid-auth/eid-tencent.util'

/**
 * 腾讯云短信发送服务
 *
 * 通过腾讯云 SMS API（2021-01-11）发送短信验证码。
 * 敏感配置（SecretId/SecretKey/SmsSdkAppId/签名/模板）全部从环境变量读取。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  /** 发送短信验证码（phone 为 11 位大陆手机号） */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const cfg = smsConfig()
    if (!isSmsConfigured()) {
      throw new Error('短信服务未配置，请检查 SMS_* 环境变量')
    }

    const response = await callTencentApi({
      service: 'sms',
      host: 'sms.tencentcloudapi.com',
      version: '2021-01-11',
      action: 'SendSms',
      region: cfg.region,
      params: {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: cfg.sdkAppId,
        SignName: cfg.signName,
        TemplateId: cfg.templateId,
        TemplateParamSet: [code],
      },
      secretId: cfg.secretId,
      secretKey: cfg.secretKey,
    })

    this.logger.debug(`[sms] SendSms 返回: ${JSON.stringify(response)}`)
  }
}
