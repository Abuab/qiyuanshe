import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator'

export class SmsLoginDto {
  /** wx.login 获取的 code，用于换取 openid */
  @IsString()
  @IsNotEmpty()
  code: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @IsString()
  @IsNotEmpty()
  smsCode: string

  /** 客户端设备信息（小程序请求不携带浏览器 UA，用于同意记录） */
  @IsString()
  @IsOptional()
  deviceInfo?: string
}
