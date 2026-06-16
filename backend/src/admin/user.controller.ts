import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminUserService } from './user.service'
import { Result } from '../common/result'

interface UserFilter {
  page?: number
  limit?: number
  keyword?: string
  gender?: number
  status?: number
  isVip?: number
  vipLevel?: number
  startDate?: string
  endDate?: string
  sort?: string
  order?: string
  minAge?: number
  maxAge?: number
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  education?: string
  occupation?: string
  minMatchCount?: number
  maxMatchCount?: number
}

@Controller('admin/users')
@Roles('super_admin', 'matchmaker', 'operator', 'readonly')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminUserController {
  constructor(
    private readonly userService: AdminUserService,
  ) {}

  @Get()
  async list(@Query() filter: UserFilter) {
    const result = await this.userService.list(filter)
    return Result.success(result)
  }

  @Get('export')
  async export(@Query() filter: any) {
    const ids = filter.ids ? filter.ids.split(',').map(Number) : []
    const data = await this.userService.export({ ...filter, ids })
    return Result.success(data)
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.detail(id)
    return Result.success(user)
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    await this.userService.updateStatus(id, status)
    return Result.success(null, '状态更新成功')
  }

  @Put(':id/vip')
  async updateVip(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { level: number; days: number },
  ) {
    await this.userService.updateVip(id, body.level, body.days)
    return Result.success(null, 'VIP设置成功')
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    await this.userService.resetPassword(id)
    return Result.success(null, '密码重置成功')
  }

  @Post(':id/notify')
  @HttpCode(HttpStatus.OK)
  async sendNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title: string,
    @Body('content') content: string,
  ) {
    await this.userService.sendNotification(id, title, content)
    return Result.success(null, '通知已发送')
  }

  @Get(':id/photos')
  async getPhotos(@Param('id', ParseIntPipe) id: number) {
    const photos = await this.userService.getPhotos(id)
    return Result.success(photos)
  }

  @Post(':id/photos')
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { photoUrl: string },
  ) {
    const photo = await this.userService.addPhoto(id, body.photoUrl)
    return Result.success(photo, '照片上传成功')
  }

  @Delete('photos/:photoId')
  async deletePhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    await this.userService.deletePhoto(photoId)
    return Result.success(null, '照片已删除')
  }

  @Put('photos/:photoId/main')
  async setMainPhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    await this.userService.setMainPhoto(photoId)
    return Result.success(null, '已设为主图')
  }

  @Put('batch-status')
  async batchUpdateStatus(@Body() body: { ids: number[]; status: number }) {
    await this.userService.batchUpdateStatus(body.ids, body.status)
    return Result.success(null, '批量状态更新成功')
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.softDelete(id)
    return Result.success(null, '用户已删除')
  }

  @Post('batch-delete')
  async batchDelete(@Body() body: { ids: number[] }) {
    await this.userService.batchSoftDelete(body.ids)
    return Result.success(null, '批量删除成功')
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      nickname: string
      phone: string
      password?: string
      gender?: number
      avatar?: string
      birthYear?: number
      education?: string
      incomeRange?: string
      housingStatus?: string
      carStatus?: string
      maritalStatus?: string
      height?: number
      weight?: number
      occupation?: string
      hometown?: string
      residence?: string
      status?: number
      personalityTags?: string
      hopeTaTags?: string
      onlyChild?: string
      whenMarry?: string
      zodiac?: string
      constellation?: string
      partnerAgeRange?: string
      partnerHeightMin?: string
      partnerEducation?: string
      partnerIncome?: string
      housingRequirement?: string
      partnerMaritalStatus?: string
      acceptChildren?: string
      photoUrls?: string[]
    },
  ) {
    const user = await this.userService.createUser({ ...body, adminId: req.user?.id })
    return Result.success(user, '用户创建成功')
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    await this.userService.updateUser(id, body)
    return Result.success(null, '用户更新成功')
  }

  @Post(':id/regenerate-dynamics')
  async regenerateDynamics(@Param('id', ParseIntPipe) id: number) {
    const result = await this.userService.regenerateUserDynamics(id)
    return Result.success(result)
  }
}
