import { IsOptional, IsString } from 'class-validator'

export class OcrIdCardDto {
  @IsOptional()
  @IsString()
  imageBase64?: string
}
