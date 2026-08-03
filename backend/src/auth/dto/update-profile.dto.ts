import { IsOptional, IsString, IsNumber, IsArray, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
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
  @MaxLength(20)
  education?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  occupation?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  incomeRange?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  housingStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  maritalStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hometown?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  residence?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mateRequirement?: string

  @IsOptional()
  @IsArray()
  photos?: string[]
}
