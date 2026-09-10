import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator'

export class SendSmsCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  /** 设备指纹哈希（UA/屏幕/时区等非敏感信息拼接后哈希） */
  @IsString()
  @IsOptional()
  deviceFingerprint?: string

  /** 图形验证码校验通过后签发的一次性 token（风控触发时必填） */
  @IsString()
  @IsOptional()
  captchaToken?: string

  /** 防重放：请求时间戳（毫秒） */
  @IsOptional()
  timestamp?: number | string

  /** 防重放：一次性随机串 */
  @IsString()
  @IsOptional()
  nonce?: string
}
