import { IsInt, IsOptional, IsString } from 'class-validator'

export class AuditSinglePromiseDto {
  @IsInt()
  status: number

  @IsOptional()
  @IsString()
  rejectReason?: string

  @IsOptional()
  @IsInt()
  adminId?: number
}
