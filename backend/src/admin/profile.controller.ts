import {
  Controller,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { AdminProfileService, UpdateAdminProfileDto } from './profile.service'
import { Result } from '../common/result'

@Controller('admin')
@UseGuards(AdminJwtAuthGuard)
export class AdminProfileController {
  constructor(private readonly profileService: AdminProfileService) {}

  @Put('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateAdminProfileDto) {
    const adminId = req.user.id
    const user = await this.profileService.updateProfile(adminId, dto)
    return Result.success(user, '保存成功')
  }
}
