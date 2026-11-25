import { IsOptional, IsString } from 'class-validator'

export class H5CreateOrderDto {
  @IsOptional()
  @IsString()
  realName?: string

  @IsOptional()
  @IsString()
  idCard?: string
}

export class H5QueryResultDto {
  @IsOptional()
  @IsString()
  orderNo?: string

  @IsOptional()
  @IsString()
  code?: string
}
