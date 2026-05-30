import { IsString, IsNotEmpty } from 'class-validator'

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  sessionKey: string

  @IsString()
  @IsNotEmpty()
  encryptedData: string

  @IsString()
  @IsNotEmpty()
  iv: string
}
