import { IsInt, IsOptional, IsString } from 'class-validator'

export class AuditEducationAuthDto {
  @IsInt()
  status: number

  @IsOptional()
  @IsString()
  rejectReason?: string
}
