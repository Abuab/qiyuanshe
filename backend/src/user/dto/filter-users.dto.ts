import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class FilterUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(80)
  ageMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(80)
  ageMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(140)
  @Max(200)
  heightMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(140)
  @Max(200)
  heightMax?: number

  @IsOptional()
  @IsIn([0, 1, 2])
  gender?: number

  @IsOptional()
  @IsString()
  education?: string

  @IsOptional()
  @IsString()
  incomeRange?: string

  @IsOptional()
  @IsString()
  maritalStatus?: string

  @IsOptional()
  @IsIn([0, 1])
  isRealName?: number

  @IsOptional()
  @IsString()
  residence?: string

  @IsOptional()
  @IsString()
  hometown?: string

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
  limit?: number = 10

  @IsOptional()
  @IsString()
  keyword?: string
}
