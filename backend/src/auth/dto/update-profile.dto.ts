import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string

  @IsOptional()
  @IsString()
  avatar?: string

  @IsOptional()
  @IsNumber()
  gender?: number

  @IsOptional()
  @IsNumber()
  birthYear?: number

  @IsOptional()
  @IsNumber()
  height?: number

  @IsOptional()
  @IsNumber()
  weight?: number

  @IsOptional()
  @IsString()
  education?: string

  @IsOptional()
  @IsString()
  occupation?: string

  @IsOptional()
  @IsString()
  incomeRange?: string

  @IsOptional()
  @IsString()
  housingStatus?: string

  @IsOptional()
  @IsString()
  maritalStatus?: string

  @IsOptional()
  @IsString()
  hometown?: string

  @IsOptional()
  @IsString()
  residence?: string

  @IsOptional()
  @IsString()
  mateRequirement?: string

  @IsOptional()
  @IsArray()
  photos?: string[]
}
