import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from './admin-jwt.guard'
import { RoleGuard } from './role.guard'
import { Roles } from './roles.decorator'
import { AdminRole } from '../shared/enums'
import { LicenseService } from '../license/license.service'
import { Result } from '../common/result'

/** 管理后台授权管理接口（仅超级管理员，需登录） */
@Controller('admin/license')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
export class AdminLicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('status')
  @Roles(AdminRole.SUPER_ADMIN)
  async getStatus() {
    return Result.success(await this.licenseService.getLicenseInfo())
  }

  @Post('activate')
  @Roles(AdminRole.SUPER_ADMIN)
  async activate(@Body('licenseKey') licenseKey: string) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return Result.error('License Key 不能为空', 400)
    }
    try {
      const info = await this.licenseService.activateLicense(licenseKey.trim())
      return Result.success(info, '激活成功')
    } catch (e: any) {
      return Result.error(e?.message || '激活失败，请检查 License Key 是否正确', 400)
    }
  }

  @Post('deactivate')
  @Roles(AdminRole.SUPER_ADMIN)
  async deactivate() {
    try {
      await this.licenseService.deactivateLicense()
      return Result.success(null, '解绑成功')
    } catch (e: any) {
      return Result.error(e?.message || '解绑失败', 400)
    }
  }

  @Get('activations')
  @Roles(AdminRole.SUPER_ADMIN)
  async getActivations() {
    return Result.success(await this.licenseService.getActivationSummary())
  }
}
