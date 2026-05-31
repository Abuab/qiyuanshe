import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, MaxLength } from 'class-validator'

export enum ActivityType {
  LATEST = 'latest',
  ONLINE = 'online',
  CP = 'cp',
}

export enum ActivityStatus {
  DRAFT = 0,
  ONGOING = 1,
  ENDED = 2,
  CANCELLED = 3,
}

export class CreateActivityDto {
  @IsString()
  @MaxLength(200, { message: '标题最多200字' })
  title: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '副标题最多500字' })
  subtitle?: string

  @IsString()
  coverImage: string

  @IsOptional()
  @IsString()
  content?: string

  @IsEnum(ActivityType, { message: '活动类型必须是 latest、online 或 cp' })
  activityType: ActivityType

  @IsOptional()
  @IsDateString()
  signUpEndTime?: string

  @IsDateString()
  startTime: string

  @IsDateString()
  endTime: string

  @IsOptional()
  @IsString()
  location?: string

  @IsInt()
  @Min(0)
  maxParticipants: number

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus
}
