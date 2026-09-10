import { IsString, IsNotEmpty, Matches } from 'class-validator'

export class VerifyCaptchaDto {
  @IsString()
  @IsNotEmpty()
  captchaId: string

  @IsString()
  @IsNotEmpty()
  code: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string
}
