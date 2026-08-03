import { IsOptional, IsString, IsInt, Min, Max, IsIn, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateMatchmakerDto {
  @IsString()
  @MaxLength(50)
  name: string

  @IsString()
  avatar: string

  @IsString()
  @MaxLength(100)
  title: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  wechat?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  qrCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsIn([0, 1])
  isActive?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateMatchmakerDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  wechat?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  qrCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsIn([0, 1])
  isActive?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}
