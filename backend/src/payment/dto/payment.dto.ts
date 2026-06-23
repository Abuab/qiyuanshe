import { IsInt, Min, Max, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vipPackageId: number
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
