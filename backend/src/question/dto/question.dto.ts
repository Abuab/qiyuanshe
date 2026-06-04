import { IsOptional, IsInt, Min, Max, MaxLength, IsArray, ArrayMaxSize } from 'class-validator'
import { Type } from 'class-transformer'

export class GetQuestionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20
}

export class CreateAnswerDto {
  @MaxLength(200, { message: '回答内容不能超过200字' })
  content: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: '最多上传3张图片' })
  photos?: string[]
}
