import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
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
  education?: string
}

@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard)
export class AdminUserController {
  constructor(private readonly userService: AdminUserService) {}

  @Get()
  async list(@Query() filter: UserFilter) {
    const result = await this.userService.list(filter)
    return Result.success(result)
  }

  @Get('export')
  async export(@Query() filter: UserFilter) {
    const data = await this.userService.export(filter)
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
  async sendNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
  ) {
    await this.userService.sendNotification(id, content)
    return Result.success(null, '通知已发送')
  }

  @Get(':id/photos')
  async getPhotos(@Param('id', ParseIntPipe) id: number) {
    const photos = await this.userService.getPhotos(id)
    return Result.success(photos)
  }

  @Put('batch-status')
  async batchUpdateStatus(@Body() body: { ids: number[]; status: number }) {
    await this.userService.batchUpdateStatus(body.ids, body.status)
    return Result.success(null, '批量状态更新成功')
  }

  @Post()
  async create(
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
      occupation?: string
      hometown?: string
      residence?: string
      status?: number
    },
  ) {
    const user = await this.userService.createUser(body)
    return Result.success(user, '用户创建成功')
  }
}
