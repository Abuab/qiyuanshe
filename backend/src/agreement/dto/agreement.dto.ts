import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { AgreementType } from '../../entities/Agreement'

export class CreateAgreementDto {
  @IsEnum(AgreementType)
  type: AgreementType

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000, { message: '协议内容不能超过50000字' })
  content: string
}

export class UpdateAgreementDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @IsString()
  @IsOptional()
  @MaxLength(50000)
  content?: string

  @IsOptional()
  isActive?: number
}
