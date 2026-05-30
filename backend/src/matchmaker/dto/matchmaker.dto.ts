import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateMatchmakerDto {
  @IsString()
  name: string

  @IsString()
  avatar: string

  @IsString()
  title: string

  @IsOptional()
  @IsString()
  wechat?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  qrCode?: string

  @IsOptional()
  @IsString()
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
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  wechat?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  qrCode?: string

  @IsOptional()
  @IsString()
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
