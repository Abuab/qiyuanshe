import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class SendMessageDto {
  @IsNumber()
  @Type(() => Number)
  toUserId: number

  @IsString()
  content: string

  @IsString()
  @IsOptional()
  type?: string = 'text'
}

export class QueryMessagesDto {
  @IsNumber()
  @Type(() => Number)
  userId: number

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1

  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20
}

export class QueryConversationsDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1

  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20
}

export class PollMessagesDto {
  @IsNumber()
  @Type(() => Number)
  userId: number

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  afterId: number = 0
}
