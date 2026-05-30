import { IsOptional, IsInt, Min, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class TrackShareDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  templateId?: number

  @IsOptional()
  @IsString()
  scene?: string
}

export class GeneratePosterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  templateId?: number
}
