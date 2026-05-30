import { IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  vipLevel: number
}

export class QueryOrdersDto {
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

export class WechatPayNotifyDto {
  return_code: string
  return_msg: string
  transaction_id?: string
  out_trade_no?: string
  total_fee?: number
  cash_fee?: number
  time_end?: string
  sign?: string
}
