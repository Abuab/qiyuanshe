import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string

  @IsString()
  @IsNotEmpty()
  encryptedData: string

  @IsString()
  @IsNotEmpty()
  iv: string

  /** 客户端设备信息（小程序请求不携带浏览器 UA，用于同意记录） */
  @IsString()
  @IsOptional()
  deviceInfo?: string
}
