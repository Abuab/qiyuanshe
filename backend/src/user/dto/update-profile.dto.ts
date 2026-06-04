import { IsOptional, IsInt, Min, Max, IsString, IsIn, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  gender?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1940)
  @Max(2010)
  birthYear?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  height?: number

  @IsOptional()
  @IsString()
  @MaxLength(20)
  education?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  occupation?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  incomeRange?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  maritalStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hometown?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  residence?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  selfIntro?: string
}
