import { IsString, IsArray, IsOptional, IsInt, MaxLength, ArrayMaxSize } from 'class-validator'

export class CreateDynamicDto {
  @IsString()
  @MaxLength(500, { message: '内容不能超过500字' })
  content: string

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(9, { message: '最多上传9张图片' })
  images?: string[]

  @IsInt()
  @IsOptional()
  totalImages?: number
}
