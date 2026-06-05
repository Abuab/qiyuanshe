import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator'
import { AgreementType } from '../../entities/Agreement'

export class CreateAgreementDto {
  @IsEnum(AgreementType)
  type: AgreementType

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  content: string
}

export class UpdateAgreementDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  content?: string

  @IsOptional()
  isActive?: number
}
