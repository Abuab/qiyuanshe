import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AiRateLimitService } from './ai-rate-limit.service'
import { Result } from '../common/result'

/**
 * 管理后台：AI 防刷黑名单管理接口
 */
@Controller('admin/ai/blacklist')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin')
export class AdminAiBlacklistController {
  constructor(private readonly rateLimitService: AiRateLimitService) {}

  // ===== 查询 =====

  /** 获取 IP 黑名单列表 */
  @Get('ips')
  async getBlacklistIps() {
    const ips = await this.rateLimitService.getBlacklistIps()
    return Result.success({ count: ips.length, list: ips })
  }

  /** 获取设备黑名单列表 */
  @Get('devices')
  async getBlacklistDevices() {
    const devices = await this.rateLimitService.getBlacklistDevices()
    return Result.success({ count: devices.length, list: devices.map((f) => f.slice(0, 12) + '...') })
  }

  /** 获取用户黑名单列表 */
  @Get('users')
  async getBlacklistUsers() {
    const users = await this.rateLimitService.getBlacklistUsers()
    return Result.success({ count: users.length, list: users })
  }

  // ===== 添加 =====

  /** 手动添加 IP 黑名单 */
  @Post('ips')
  async addIpBlacklist(@Body('ip') ip: string, @Body('reason') reason?: string) {
    if (!ip) return Result.badRequest('IP 地址不能为空')
    await this.rateLimitService.addIpBlacklist(ip, reason || '管理员手动封禁')
    return Result.success(null, `IP ${ip} 已加入黑名单`)
  }

  /** 手动添加设备黑名单 */
  @Post('devices')
  async addDeviceBlacklist(@Body('fingerprint') fingerprint: string, @Body('reason') reason?: string) {
    if (!fingerprint) return Result.badRequest('设备指纹不能为空')
    await this.rateLimitService.addDeviceBlacklist(fingerprint, reason || '管理员手动封禁')
    return Result.success(null, '设备已加入黑名单')
  }

  // ===== 移除 =====

  /** 移除 IP 黑名单 */
  @Delete('ips/:ip')
  async removeIpBlacklist(@Param('ip') ip: string) {
    await this.rateLimitService.removeIpBlacklist(ip)
    return Result.success(null, `IP ${ip} 已移出黑名单`)
  }

  /** 移除设备黑名单 */
  @Delete('devices/:fingerprint')
  async removeDeviceBlacklist(@Param('fingerprint') fingerprint: string) {
    await this.rateLimitService.removeDeviceBlacklist(fingerprint)
    return Result.success(null, '设备已移出黑名单')
  }

  /** 移除用户黑名单 */
  @Delete('users/:userId')
  async removeUserBlacklist(@Param('userId') userId: number) {
    await this.rateLimitService.removeUserBlacklist(userId)
    return Result.success(null, `用户 ${userId} 已移出黑名单`)
  }
}
