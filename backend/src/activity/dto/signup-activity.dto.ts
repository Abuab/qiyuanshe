import { IsOptional, IsString } from 'class-validator'

export class SignupActivityDto {
  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  remark?: string
}
