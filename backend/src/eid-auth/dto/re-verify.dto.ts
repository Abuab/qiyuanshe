import { IsOptional, IsString } from 'class-validator'

export class ReVerifyDto {
  @IsOptional()
  @IsString()
  idCard?: string
}
