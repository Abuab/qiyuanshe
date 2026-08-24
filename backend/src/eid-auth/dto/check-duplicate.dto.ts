import { IsOptional, IsString } from 'class-validator'

export class CheckIdCardDuplicateDto {
  @IsOptional()
  @IsString()
  idCard?: string

  @IsOptional()
  @IsString()
  realName?: string
}
