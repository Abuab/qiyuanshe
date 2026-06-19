import { Controller, Get, Put, Body, Query, Req, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../admin/admin-jwt.guard'
import { RoleGuard } from '../admin/role.guard'
import { Roles } from '../admin/roles.decorator'
import { AiConfigService } from './ai-config.service'
import { AiFeatureKey } from './types'
import { Result } from '../common/result'

@Controller('admin/ai')
@UseGuards(AdminJwtAuthGuard, RoleGuard)
@Roles('super_admin', 'matchmaker', 'operator')
export class AdminAiController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  /** 获取 AI 功能开关配置（管理后台） */
  @Get('switches')
  async getSwitches() {
    const config = await this.aiConfigService.getAdminConfig()
    return Result.success(config)
  }

  /** 更新子功能开关（运营人员可操作） */
  @Put('switch')
  @Roles('super_admin', 'matchmaker', 'operator')
  async updateSubSwitch(
    @Body('key') key: AiFeatureKey,
    @Body('enabled') enabled: boolean,
    @Req() req: any,
  ) {
    const operatorId = req.user?.id || null
    const ipAddress = req.ip || req.connection?.remoteAddress || ''

    // 从类型定义中获取 DB key
    const dbKey = `ai.feature.${key}.enabled`

    await this.aiConfigService.updateSwitch(dbKey, enabled, operatorId, ipAddress)
    return Result.success(null, '开关已更新')
  }

  /** 更新总开关（仅超级管理员） */
  @Put('master-switch')
  @Roles('super_admin')
  async updateMasterSwitch(
    @Body('enabled') enabled: boolean,
    @Req() req: any,
  ) {
    const operatorId = req.user?.id || null
    const ipAddress = req.ip || req.connection?.remoteAddress || ''

    await this.aiConfigService.updateSwitch(
      'ai.feature.master.enabled',
      enabled,
      operatorId,
      ipAddress,
    )
    return Result.success(null, '总开关已更新')
  }

  /** 获取开关操作日志 */
  @Get('switch-logs')
  async getSwitchLogs(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const p = Math.max(1, parseInt(page) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const data = await this.aiConfigService.getSwitchLogs(p, l)
    return Result.success(data)
  }
}
