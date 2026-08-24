import { IsOptional, IsString } from 'class-validator'

export class QueryEidResultDto {
  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsString()
  idCard?: string
}
