import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export enum AuditType {
  USER = 'user',
  PHOTO = 'photo',
  ANSWER = 'answer',
}

export enum AuditStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

export class AuditPhotoDto {
  @IsNumber()
  @Type(() => Number)
  photoId: number

  @IsString()
  photoUrl: string

  @IsNumber()
  @Type(() => Number)
  userId: number
}

export class AuditTextDto {
  @IsString()
  text: string

  @IsEnum(AuditType)
  type: AuditType

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  targetId?: number

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  userId?: number
}

export class QueryPendingAuditDto {
  @IsEnum(AuditType)
  @IsOptional()
  type?: AuditType

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20
}

export class ApproveAuditDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  adminId?: number

  @IsString()
  @IsOptional()
  reason?: string
}

export class RejectAuditDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  adminId?: number

  @IsString()
  reason: string
}
