import { IsOptional, IsString } from 'class-validator'

export class SubmitEducationAuthDto {
  @IsOptional()
  @IsString()
  school?: string

  @IsOptional()
  @IsString()
  degree?: string
}
