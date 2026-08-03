import { IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class SendMessageDto {
  @IsNumber()
  @Type(() => Number)
  toUserId: number

  @IsString()
  @MaxLength(500, { message: '消息不能超过500字' })
  content: string

  @IsString()
  @IsOptional()
  type?: string = 'text'

  // 代发相关字段（仅管理员可用，普通用户传入会被 service 重置）
  @IsNumber()
  @IsOptional()
  isProxy?: number

  @IsNumber()
  @IsOptional()
  proxyBy?: number

  @IsString()
  @IsOptional()
  proxyName?: string
}

export class QueryMessagesDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  beforeId?: number

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
