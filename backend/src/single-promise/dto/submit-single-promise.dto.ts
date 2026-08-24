import { IsOptional, IsString } from 'class-validator'

export class SubmitSinglePromiseDto {
  @IsOptional()
  @IsString()
  realName?: string
}
